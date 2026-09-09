import { env } from "../config/env.js";
import { LlmError, type TextGenerationOptions, type TextGenerator } from "./types.js";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

export interface GeminiClientOptions {
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export class GeminiClient implements TextGenerator {
  private readonly fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly apiKey?: string;

  constructor(options: GeminiClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiKey = options.apiKey ?? env.LLM_API_KEY;
    this.timeoutMs = options.timeoutMs ?? env.LLM_TIMEOUT_MS;
    this.retries = options.retries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 250;
  }

  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    if (!this.apiKey) throw new LlmError("LLM_NOT_CONFIGURED", "LLM_API_KEY is not configured.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.LLM_MODEL)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.2,
              maxOutputTokens: options.maxOutputTokens ?? 4_096,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        const body = await response.json() as GeminiResponse;
        if (!response.ok) {
          throw new LlmError(`LLM_HTTP_${response.status}`, body.error?.message ?? "Gemini request failed.", retryableStatus(response.status));
        }
        const text = body.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
        if (!text) throw new LlmError("LLM_EMPTY_RESPONSE", "Gemini returned no text content.");
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