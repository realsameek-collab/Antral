// Context-window and work limits per agent. Each agent (the orchestrator now,
// specialist security agents later) gets its own budget; anything not set for
// an agent falls back to `default`. Token counts are estimates (~4 chars/token).
//
// Env overrides apply to every agent: AGENT_CONTEXT_TOKENS, AGENT_HISTORY_TOKENS,
// AGENT_MAX_TURNS, AGENT_MAX_OUTPUT_TOKENS.
const AGENT_LIMITS = {
  default: {
    // Total budget for one model request (system + history + this run's work).
    contextTokens: 32_000,
    // Budget for remembered conversation history before older turns are
    // folded into the conversation summary.
    historyTokens: 10_000,
    // Recent messages always kept word-for-word when compacting.
    keepRecentMessages: 8,
    // Tool-loop steps per run.
    maxTurns: 25,
    // Longest reply the model may write in one step.
    maxOutputTokens: 4_096,
  },
  orchestrator: {},
};

const envInt = (name) => {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const limitsFor = (agent = "orchestrator") => {
  const merged = { ...AGENT_LIMITS.default, ...(AGENT_LIMITS[agent] || {}) };
  const overrides = {
    contextTokens: envInt("AGENT_CONTEXT_TOKENS"),
    historyTokens: envInt("AGENT_HISTORY_TOKENS"),
    maxTurns: envInt("AGENT_MAX_TURNS"),
    maxOutputTokens: envInt("AGENT_MAX_OUTPUT_TOKENS"),
  };
  for (const [k, v] of Object.entries(overrides)) if (v !== undefined) merged[k] = v;
  // History must leave room for the run's own work.
  merged.historyTokens = Math.min(merged.historyTokens, Math.floor(merged.contextTokens * 0.5));
  return merged;
};

// Rough token estimate for chat messages.
export const estimateTokens = (messages) =>
  messages.reduce((sum, m) => {
    const content = Array.isArray(m.content)
      ? m.content.reduce(
          (tokens, part) => tokens + (part.type === "image_url" ? 2_048 : (part.text || "").length / 4),
          0,
        )
      : typeof m.content === "string"
        ? m.content
        : JSON.stringify(m.content ?? "");
    const calls = m.tool_calls ? JSON.stringify(m.tool_calls) : "";
    return sum + (Array.isArray(m.content) ? Math.ceil(content + calls.length / 4) : Math.ceil((content.length + calls.length) / 4)) + 4;
  }, 0);
