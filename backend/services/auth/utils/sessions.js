import { randomBytes } from "node:crypto";
import { redis } from "../config/redis.js";

export const SESSION_COOKIE = "antral_session";
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

const sessionKey = (sessionId) => `session:${sessionId}`;

export const getSessionId = (req) => {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const sessionId = cookie?.slice(SESSION_COOKIE.length + 1);
  return sessionId && /^[a-f0-9]{64}$/.test(sessionId) ? sessionId : null;
};

export const createSession = async (session) => {
  const sessionId = randomBytes(32).toString("hex");
  await redis.set(sessionKey(sessionId), JSON.stringify(session), {
    EX: SESSION_TTL_SECONDS,
  });
  return sessionId;
};

export const readSession = async (sessionId) => {
  if (!sessionId) return null;
  const value = await redis.get(sessionKey(sessionId));
  return value ? JSON.parse(value) : null;
};

export const updateSession = async (sessionId, session) => {
  await redis.set(sessionKey(sessionId), JSON.stringify(session), {
    EX: SESSION_TTL_SECONDS,
  });
};

export const deleteSession = async (sessionId) => {
  if (sessionId) await redis.del(sessionKey(sessionId));
};

export const setSessionCookie = (res, sessionId) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`
  );
};

export const clearSessionCookie = (res) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
};
