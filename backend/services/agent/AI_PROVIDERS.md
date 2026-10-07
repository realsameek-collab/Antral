# Cloudflare Workers AI

The agent can use Cloudflare Workers AI as another OpenAI-compatible chat
provider, including tool calling. It participates in the existing provider
fallback chain and is selected automatically when configured after the existing
Groq, Gemini and OpenRouter providers.

## Configure

The agent `.env` needs both:

- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.
- `CLOUDFLARE_API_TOKEN` — a token with Workers AI permissions. Keep the token
  private and restart the agent service after setting it. Cloudflare's
  recommended token template grants Workers AI Read and Edit.

To select Cloudflare as the preferred provider, set `LLM_PROVIDER=cloudflare`.
Otherwise, it is used as a fallback after earlier configured providers. The
default model is `@cf/openai/gpt-oss-20b`; set `LLM_MODEL` to use another
compatible Workers AI model that supports tool calling.

Cloudflare Workers AI has a daily free allocation, but it is limited; usage
above the allocation may require a paid Workers plan. Check current Cloudflare
pricing and usage limits before enabling it as the preferred provider. The
default model is text-only, so image requests require another configured
vision-capable provider.

`ANYAPI_API_KEY` alone does not identify an API endpoint or model. AnyAPI is
not automatically used as a model provider; wire it in only after choosing a
specific API/model endpoint.
