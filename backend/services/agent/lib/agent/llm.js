import axios from "axios";

// Provider-agnostic chat client. Groq, Gemini and OpenRouter all expose an
// OpenAI-compatible /chat/completions endpoint with tool calling, so one
// adapter covers them. Pick with LLM_PROVIDER (and optionally LLM_MODEL);
// otherwise the first provider with an API key configured is used.
const PROVIDERS = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    defaultModel: "openai/gpt-oss-120b",
    defaultVisionModel: "qwen/qwen3.8-27b",
  },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnv: "GEMINI_API_KEY",
    defaultModel: "gemini-2.5-flash",
    defaultVisionModel: "gemini-2.5-flash",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
    defaultModel: "openai/gpt-oss-120b",
    defaultVisionModel: "google/gemini-2.5-flash",
  },
};

export const resolveProvider = ({ vision = false } = {}) => {
  const wanted = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  const name = wanted || Object.keys(PROVIDERS).find((p) => process.env[PROVIDERS[p].keyEnv]);
  const provider = PROVIDERS[name];
  if (!provider) throw new Error("No LLM provider configured. Set GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY.");
  const apiKey = process.env[provider.keyEnv];
  if (!apiKey) throw new Error(`LLM provider "${name}" is selected but ${provider.keyEnv} is not set.`);
  const model = vision
    ? process.env.LLM_VISION_MODEL || provider.defaultVisionModel
    : process.env.LLM_MODEL || provider.defaultModel;
  if (!model) {
    throw new Error(`No vision model is configured for "${name}". Set LLM_VISION_MODEL to a model that supports image input.`);
  }
  return { name, ...provider, apiKey, model };
};

// Converts registry tools to the OpenAI function-tool format.
export const toToolSchemas = (tools) =>
  tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

const MAX_RETRIES = 4;
const MAX_WAIT_MS = 90_000;

// How long to wait before retrying a rate-limited or overloaded request:
// the Retry-After header, the "try again in 24.9s" hint, or backoff.
const retryDelayMs = (error, attempt) => {
  const header = Number(error.response?.headers?.["retry-after"]);
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const hint = /try again in (?:(\d+)m)?([\d.]+)s/i.exec(error.response?.data?.error?.message || "");
  if (hint) return (Number(hint[1] || 0) * 60 + Number(hint[2])) * 1000 + 500;
  return 2_000 * 2 ** attempt;
};

const isRetryable = (error) => {
  const status = error.response?.status;
  return status === 429 || status === 503 || status === 502 || error.code === "ECONNRESET";
};

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("cancelled"));
      },
      { once: true },
    );
  });

// One model turn. Returns the assistant message ({ content, tool_calls? }).
// Rate limits and temporary provider errors are retried with backoff.
export const chat = async (args) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await chatOnce(args);
    } catch (error) {
      const wait = isRetryable(error) ? retryDelayMs(error, attempt) : 0;
      if (!wait || attempt >= MAX_RETRIES || wait > MAX_WAIT_MS || args.signal?.aborted) {
        throw error;
      }
      await sleep(wait, args.signal);
    }
  }
};

const chatOnce = async ({ messages, tools = [], signal, maxTokens }) => {
  const hasImageInput = messages.some(
    (message) =>
      Array.isArray(message.content) &&
      message.content.some((part) => part.type === "image_url"),
  );
  const provider = resolveProvider({ vision: hasImageInput });
  try {
    const { data } = await axios.post(
      `${provider.baseURL}/chat/completions`,
      {
        model: provider.model,
        messages,
        ...(tools.length ? { tools, tool_choice: "auto" } : {}),
        temperature: 0.2,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      },
      {
        headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
        timeout: 120_000,
        signal,
      },
    );
    const message = data?.choices?.[0]?.message;
    if (!message) throw new Error("The model returned no message.");
    return { message, usage: data.usage, provider: provider.name, model: provider.model };
  } catch (error) {
    // Never surface the request config (it holds the API key).
    // Keep status/headers for the retry logic; message is safe to show.
    const detail = error.response?.data?.error?.message || error.message;
    const wrapped = new Error(`LLM request to ${provider.name} failed: ${detail}`);
    wrapped.response = error.response && {
      status: error.response.status,
      headers: error.response.headers,
      data: error.response.data,
    };
    wrapped.code = error.code;
    throw wrapped;
  }
};
