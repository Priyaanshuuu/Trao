import assert from "node:assert/strict";
import test from "node:test";
import type { TextGenerator } from "./llm/types.js";
import { runBatch } from "./evaluate.js";

const generator: TextGenerator = {
  generateText: async (prompt) => {
    if (prompt.startsWith("Extract")) return JSON.stringify({ roleTitle: "Engineer", seniority: "Senior", responsibilities: ["Build APIs"], requirements: [{ id: "req-api", text: "API design", kind: "technical", priority: "must" }] });
    if (prompt.startsWith("Generate interview questions")) return JSON.stringify({ questions: [{ id: "q-api", prompt: "Design an API.", category: "technical", difficulty: 2, answerOutline: "Discuss contracts.", requirementIds: ["req-api"] }] });
    return JSON.stringify({ flashcards: [{ id: "card-api", question: "What is an API?", answer: "A service contract.", requirementIds: ["req-api"] }] });
  },
};

test("continues the batch after an individual case fails", async () => {
  const output = await runBatch([
    { id: "case-invalid", jd: "This job description is long enough for validation.", company_url: "file:///unsafe", days: 5 },
    { id: "case-ok", jd: "This job description is long enough for validation.", company_url: "https://acme.example/", days: 1 },
  ], { generator, research: async (url) => {
    if (url.startsWith("file:")) throw new Error("URL_PROTOCOL_UNSUPPORTED");
    return { startingUrl: url, sources: [{ url, title: "Acme", text: "API company", links: [] }], failures: [], hiringSources: [], researchGaps: [] };
  } });
  assert.equal(output.kits[0]?.status, "failed");
  assert.equal(output.kits[0]?.error?.code, "INVALID_COMPANY_URL");
  assert.equal(output.kits[1]?.status, "ok");
  assert.equal(output.kits.length, 2);
});

test("returns the required output envelope", async () => {
  const output = await runBatch([{ id: "case-one", jd: "This job description is long enough for validation.", company_url: "https://acme.example/", days: 2 }], { generator, research: async (url) => ({ startingUrl: url, sources: [{ url, title: "Acme", text: "API company", links: [] }], failures: [], hiringSources: [], researchGaps: [] }) });
  assert.equal(output.version, "1.0");
  assert.match(output.generated_at, /^202\d-/);
  assert.equal(output.kits[0]?.id, "case-one");
});