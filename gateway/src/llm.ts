/**
 * Výměnná vrstva pro LLM volání. Tools typu `llm` závisí jen na tomto rozhraní.
 * Implementace pro LiteLLM proxy = OpenAI-kompatibilní /chat/completions;
 * URL a model z env (LITELLM_BASE_URL, LITELLM_MODEL, volitelně LITELLM_API_KEY).
 */
export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface LlmRequest {
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}
export interface LlmResponse {
  text: string;
  model?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}
export interface LlmClient {
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}

export class LlmNotConfiguredError extends Error {
  constructor(msg = "LLM backend is not configured (LITELLM_BASE_URL, LITELLM_MODEL).") {
    super(msg);
    this.name = "LlmNotConfiguredError";
  }
}

export class LiteLlmClient implements LlmClient {
  constructor(private readonly opts: { baseUrl?: string; model?: string; apiKey?: string }) {}

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
    const { baseUrl, model, apiKey } = this.opts;
    if (!baseUrl || !model) throw new LlmNotConfiguredError();
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({
        model,
        messages: req.messages,
        ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      }),
      signal,
    });
    if (!res.ok) throw new Error(`LLM backend returned HTTP ${res.status}`);
    const j = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: j.choices?.[0]?.message?.content ?? "",
      model: j.model,
      usage: { promptTokens: j.usage?.prompt_tokens, completionTokens: j.usage?.completion_tokens },
    };
  }
}
