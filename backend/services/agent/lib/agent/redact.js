// Masks credentials in anything the agents read before it leaves this machine
// (to the LLM provider) or is stored in the audit log. The agents can still say
// *where* a secret is — that is the security finding — without copying it.

const PATTERNS = [
  // Connection strings with inline credentials: scheme://user:pass@host
  [/\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@'"]+:)[^\s@'"]+@/gi, "$1[REDACTED]@"],
  // Private key blocks
  [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    "-----BEGIN PRIVATE KEY----- [REDACTED] -----END PRIVATE KEY-----",
  ],
  // Well-known token formats
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]"],
  [/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[REDACTED_GOOGLE_KEY]"],
  [/\bgsk_[A-Za-z0-9]{20,}\b/g, "[REDACTED_GROQ_KEY]"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_API_KEY]"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, "[REDACTED_SLACK_TOKEN]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]"],
  // KEY=value / "secret": "value" assignments whose name looks sensitive
  [
    /(\b[A-Za-z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|PWD|API_?KEY|PRIVATE_?KEY|CREDENTIALS?|ACCESS_?KEY)[A-Za-z0-9_]*["']?\s*[:=]\s*["']?)([^\s"',;]{4,})/gi,
    "$1[REDACTED]",
  ],
];

export const redactSecrets = (text) => {
  if (typeof text !== "string" || !text) return text;
  return PATTERNS.reduce((out, [re, rep]) => out.replace(re, rep), text);
};
