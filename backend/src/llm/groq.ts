import { env } from "../config/env.js";
import { LlmError, type TextGenerationOptions, type TextGenerator } from "./types.js";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export interface GroqClientOptions {
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export class GroqClient implements TextGenerator {
  private readonly fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly apiKey?: string;

  constructor(options: GroqClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiKey = options.apiKey ?? env.LLM_API_KEY;
    this.timeoutMs = options.timeoutMs ?? env.LLM_TIMEOUT_MS;
    this.retries = options.retries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 250;
  }

  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    if (!this.apiKey) throw new LlmError("LLM_NOT_CONFIGURED", "LLM_API_KEY is not configured.");

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: env.LLM_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: options.temperature ?? 0.2,
            max_tokens: options.maxOutputTokens ?? 4_096,
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        const body = await response.json() as GroqResponse;
        if (!response.ok) {
          throw new LlmError(`LLM_HTTP_${response.status}`, body.error?.message ?? "Groq request failed.", retryableStatus(response.status));
        }
        const text = body.choices?.[0]?.message?.content;
        if (!text) throw new LlmError("LLM_EMPTY_RESPONSE", "Groq returned no text content.");
        return text;
      } catch (error) {
        lastError = error;
        const retryable = error instanceof LlmError ? error.retryable : true;
        if (!retryable || attempt === this.retries) break;
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs * 2 ** (attempt - 1)));
      }
    }
    throw lastError instanceof Error ? lastError : new LlmError("LLM_REQUEST_FAILED", "LLM request failed.", true);
  }
}