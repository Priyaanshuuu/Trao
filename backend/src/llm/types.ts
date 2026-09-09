export interface TextGenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export interface TextGenerator {
  generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;
}

export class LlmError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryable = false) {
    super(message);
    this.name = "LlmError";
  }
}