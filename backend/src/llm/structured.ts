import { z } from "zod";
import { LlmError, type TextGenerationOptions, type TextGenerator } from "./types.js";

export interface StructuredGenerationOptions extends TextGenerationOptions {
  attempts?: number;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1] ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    throw new LlmError("LLM_INVALID_JSON", "LLM response was not valid JSON.");
  }
}

export async function generateStructured<T>(
  generator: TextGenerator,
  prompt: string,
  schema: z.ZodType<T>,
  options: StructuredGenerationOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 2;
  let currentPrompt = prompt;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const text = await generator.generateText(currentPrompt, options);
      const parsed = schema.safeParse(extractJson(text));
      if (!parsed.success) throw new LlmError("LLM_SCHEMA_INVALID", "LLM JSON did not match the required schema.");
      return parsed.data;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        currentPrompt = `${prompt}\n\nYour previous response was invalid. Return only valid JSON matching the requested schema. Do not include markdown or commentary.`;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new LlmError("LLM_GENERATION_FAILED", "Structured generation failed.");
}