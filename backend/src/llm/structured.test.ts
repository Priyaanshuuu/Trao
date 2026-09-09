import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { generateStructured } from "./structured.js";
import { GeminiClient } from "./gemini.js";
import { LlmError, type TextGenerator } from "./types.js";

test("parses fenced JSON and validates the requested schema", async () => {
  const generator: TextGenerator = { generateText: async () => "```json\n{\"answer\":\"ok\"}\n```" };
  const result = await generateStructured(generator, "Return an answer", z.object({ answer: z.string() }));
  assert.deepEqual(result, { answer: "ok" });
});

test("retries structured generation after an invalid response", async () => {
  let calls = 0;
  const generator: TextGenerator = { generateText: async () => ++calls === 1 ? "not json" : "{\"answer\":\"fixed\"}" };
  const result = await generateStructured(generator, "Return an answer", z.object({ answer: z.string() }));
  assert.equal(result.answer, "fixed");
  assert.equal(calls, 2);
});

test("fails clearly after schema validation attempts are exhausted", async () => {
  const generator: TextGenerator = { generateText: async () => "{\"wrong\":true}" };
  await assert.rejects(() => generateStructured(generator, "Return an answer", z.object({ answer: z.string() }), { attempts: 2 }), /schema/i);
});

test("retries transient Gemini responses and returns generated text", async () => {
  let calls = 0;
  const client = new GeminiClient({
    apiKey: "test-key",
    fetchImpl: async () => ++calls === 1
      ? new Response(JSON.stringify({ error: { message: "busy" } }), { status: 503 })
        : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: true }) }] } }] }), { status: 200 }),
    retries: 2,
    retryDelayMs: 0,
  });
  const result = await client.generateText("Return JSON");
  assert.equal(result, "{\"ok\":true}");
  assert.equal(calls, 2);
});

test("reports missing provider configuration", async () => {
  const client = new GeminiClient({ apiKey: "", retries: 1 });
  await assert.rejects(() => client.generateText("Return JSON"), (error: unknown) => error instanceof LlmError && error.code === "LLM_NOT_CONFIGURED");
});