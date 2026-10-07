import test from "node:test";
import assert from "node:assert/strict";
import { resolveProvider } from "../lib/agent/llm.js";

const ENV_KEYS = [
  "LLM_PROVIDER",
  "LLM_MODEL",
  "LLM_VISION_MODEL",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
];

const withEnv = (values, callback) => {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
  try {
    callback();
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
};

test("Cloudflare Workers AI resolves its account endpoint and tool-capable default model", () => {
  withEnv(
    {
      LLM_PROVIDER: "cloudflare",
      CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      CLOUDFLARE_API_TOKEN: "test-token",
    },
    () => {
      const provider = resolveProvider();
      assert.equal(provider.name, "cloudflare");
      assert.equal(
        provider.baseURL,
        "https://api.cloudflare.com/client/v4/accounts/0123456789abcdef0123456789abcdef/ai/v1",
      );
      assert.equal(provider.model, "@cf/openai/gpt-oss-20b");
      assert.equal(provider.apiKey, "test-token");
    },
  );
});

test("Cloudflare Workers AI requires both account ID and API token", () => {
  withEnv(
    { LLM_PROVIDER: "cloudflare", CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef" },
    () => assert.throws(() => resolveProvider(), /CLOUDFLARE_API_TOKEN is not set/),
  );
});

test("Cloudflare Workers AI is excluded from vision requests", () => {
  withEnv(
    {
      LLM_PROVIDER: "cloudflare",
      CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      CLOUDFLARE_API_TOKEN: "test-token",
    },
    () => assert.throws(() => resolveProvider({ vision: true }), /No vision-capable LLM provider is configured/),
  );
});

test("invalid Cloudflare account IDs are rejected before requests are made", () => {
  withEnv(
    {
      LLM_PROVIDER: "cloudflare",
      CLOUDFLARE_ACCOUNT_ID: "not-an-account-id",
      CLOUDFLARE_API_TOKEN: "test-token",
    },
    () => assert.throws(() => resolveProvider(), /must be a 32-character Cloudflare account ID/),
  );
});
