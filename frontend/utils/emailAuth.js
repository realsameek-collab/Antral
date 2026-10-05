// Calls to the auth service (through the gateway) for email code sign-in.
const API_URL = import.meta.env.VITE_API_URL || "/api";

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    error.status = res.status;
    error.retryAfter = data.retryAfter;
    throw error;
  }
  return data;
}

export const sendEmailCode = (email) => post("/auth/email/send-code", { email });

export const verifyEmailCode = (email, code) => post("/auth/email/verify-code", { email, code });

async function sessionRequest(path, { token, method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export const startSession = (token) =>
  sessionRequest("/auth/session", { token, method: "POST" });

export const endSession = () => sessionRequest("/auth/session", { method: "DELETE" });

export const getProfile = () => sessionRequest("/auth/profile");

export const saveProfile = (profile) =>
  sessionRequest("/auth/profile", { method: "PUT", body: profile });
