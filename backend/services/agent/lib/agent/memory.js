import crypto from "node:crypto";
import { redis } from "../../config/redis.js";
import { estimateTokens } from "./limits.js";
import { summarize } from "./context.js";
import { redactSecrets } from "./redact.js";

// Conversation memory in Redis. A conversation is a series of runs on one
// target. Each finished run adds the user's request and the agent's answer, so
// the next request continues where the last left off. When the history grows
// past the agent's historyTokens budget, the oldest turns are folded into a
// rolling summary. Everything expires after MEMORY_TTL_DAYS of inactivity.
//
// Keys (per user):
//   agent:convs:<uid>             sorted set of conversation ids by last update
//   agent:conv:<uid>:<id>:meta    hash  { title, targetType, targetId, targetLabel, summary, createdAt, updatedAt, turns }
//   agent:conv:<uid>:<id>:msgs    list  of JSON { role, content, at, tools? }

const TTL_SECONDS = (Number(process.env.MEMORY_TTL_DAYS) || 30) * 24 * 60 * 60;
const MAX_CONVERSATIONS = 100;
const MAX_MESSAGE_CHARS = 8_000;

const indexKey = (uid) => `agent:convs:${uid}`;
const metaKey = (uid, id) => `agent:conv:${uid}:${id}:meta`;
const msgsKey = (uid, id) => `agent:conv:${uid}:${id}:msgs`;

export const isConversationId = (id) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);

const touch = (pipeline, uid, id, now) =>
  pipeline
    .zadd(indexKey(uid), now, id)
    .expire(indexKey(uid), TTL_SECONDS)
    .expire(metaKey(uid, id), TTL_SECONDS)
    .expire(msgsKey(uid, id), TTL_SECONDS);

const parseMeta = (id, m) =>
  m && m.createdAt
    ? {
        id,
        title: m.title || "",
        target: { type: m.targetType, identifier: m.targetId, label: m.targetLabel || "" },
        summary: m.summary || "",
        turns: Number(m.turns || 0),
        createdAt: new Date(Number(m.createdAt)),
        updatedAt: new Date(Number(m.updatedAt)),
      }
    : null;

export const createConversation = async (uid, { target, title }) => {
  const id = crypto.randomUUID();
  const now = Date.now();
  const p = redis.multi().hset(metaKey(uid, id), {
    title: redactSecrets(title).slice(0, 120),
    targetType: target.type,
    targetId: target.identifier,
    targetLabel: target.label || "",
    summary: "",
    turns: 0,
    createdAt: now,
    updatedAt: now,
  });
  await touch(p, uid, id, now).exec();

  // Keep only the most recent conversations.
  const stale = await redis.zrange(indexKey(uid), 0, -(MAX_CONVERSATIONS + 1));
  if (stale.length) {
    await redis
      .multi()
      .zrem(indexKey(uid), ...stale)
      .del(...stale.flatMap((s) => [metaKey(uid, s), msgsKey(uid, s)]))
      .exec();
  }
  return id;
};

export const getConversation = async (uid, id) => {
  if (!isConversationId(id)) return null;
  return parseMeta(id, await redis.hgetall(metaKey(uid, id)));
};

export const getMessages = async (uid, id) =>
  (await redis.lrange(msgsKey(uid, id), 0, -1)).map((s) => JSON.parse(s));

// History to give the model: the rolling summary plus remembered turns.
export const loadHistory = async (uid, id) => {
  const [meta, messages] = await Promise.all([getConversation(uid, id), getMessages(uid, id)]);
  return {
    summary: meta?.summary || "",
    messages: messages.map(({ role, content }) => ({ role, content })),
  };
};

// Records one finished run: the user's request and the agent's answer.
export const appendTurn = async (uid, id, { user, assistant, tools = [] }) => {
  const now = Date.now();
  const entry = (role, content, extra = {}) =>
    JSON.stringify({ role, content: redactSecrets(content).slice(0, MAX_MESSAGE_CHARS), at: now, ...extra });
  const p = redis
    .multi()
    .rpush(
      msgsKey(uid, id),
      entry("user", user),
      entry("assistant", assistant, tools.length ? { tools: [...new Set(tools)] } : {}),
    )
    .hset(metaKey(uid, id), { updatedAt: now })
    .hincrby(metaKey(uid, id), "turns", 1);
  await touch(p, uid, id, now).exec();
};

// Folds the oldest turns into the summary once history exceeds the budget.
// Returns the number of messages folded (0 if none).
export const compactConversation = async (uid, id, limits, { signal } = {}) => {
  const messages = await getMessages(uid, id);
  if (estimateTokens(messages) <= limits.historyTokens) return 0;

  // Keep recent messages verbatim; fold whole user/assistant pairs.
  let keep = Math.min(limits.keepRecentMessages, messages.length);
  if ((messages.length - keep) % 2) keep += 1;
  const fold = messages.slice(0, messages.length - keep);
  if (!fold.length) return 0;

  const meta = await getConversation(uid, id);
  const summary = await summarize({
    text: fold.map((m) => `[${m.role}] ${m.content}`).join("\n"),
    previousSummary: meta?.summary || "",
    purpose: "Update the summary of this conversation between the user and the agent.",
    signal,
    maxChars: limits.contextTokens * 2,
  });

  await redis
    .multi()
    .hset(metaKey(uid, id), { summary: redactSecrets(summary) })
    .ltrim(msgsKey(uid, id), fold.length, -1)
    .exec();
  return fold.length;
};

export const listConversations = async (uid, limit = 30) => {
  const ids = await redis.zrevrange(indexKey(uid), 0, limit - 1);
  if (!ids.length) return [];
  const p = redis.pipeline();
  ids.forEach((id) => p.hgetall(metaKey(uid, id)));
  const res = await p.exec();
  return ids.map((id, i) => parseMeta(id, res[i][1])).filter(Boolean);
};

export const deleteConversation = async (uid, id) => {
  if (!isConversationId(id)) return false;
  const [[, removed]] = await redis
    .multi()
    .zrem(indexKey(uid), id)
    .del(metaKey(uid, id), msgsKey(uid, id))
    .exec();
  return removed > 0;
};

// Keyword search across the user's other conversations (titles, summaries,
// messages). Returns the best-matching snippets.
export const searchMemory = async (uid, query, { excludeId, limit = 5 } = {}) => {
  const terms = String(query || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  if (!terms.length) return [];

  const convs = (await listConversations(uid, 50)).filter((c) => c.id !== excludeId);
  const hits = [];
  for (const c of convs) {
    const messages = await getMessages(uid, c.id);
    const docs = [
      { kind: "title", text: c.title },
      { kind: "summary", text: c.summary },
      ...messages.map((m) => ({ kind: m.role, text: m.content, at: m.at })),
    ];
    for (const d of docs) {
      const lower = (d.text || "").toLowerCase();
      const score = terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
      if (!score) continue;
      const first = Math.max(0, Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0)) - 150);
      hits.push({
        score,
        conversation: c.title,
        conversationId: c.id,
        target: c.target.identifier,
        kind: d.kind,
        at: d.at ? new Date(d.at) : c.updatedAt,
        snippet: d.text.slice(first, first + 600),
      });
    }
  }
  return hits
    .sort((a, b) => b.score - a.score || b.at - a.at)
    .slice(0, limit);
};
