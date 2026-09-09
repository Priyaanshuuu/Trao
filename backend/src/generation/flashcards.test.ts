import assert from "node:assert/strict";
import test from "node:test";
import { generateFlashcards } from "./flashcards.js";
import type { Question, Requirement } from "../domain/kit.js";
import type { TextGenerator } from "../llm/types.js";

const requirements: Requirement[] = [{ id: "req-api", text: "API design", kind: "technical", priority: "must", origin: "generated", edited: false, pinned: false }];
const questions: Question[] = [{ id: "q-api", prompt: "Design an API.", category: "technical", difficulty: 2, answerOutline: "Discuss contracts.", requirementIds: ["req-api"], origin: "generated", edited: false, pinned: false }];

test("generates flashcards with preserved requirement references", async () => {
  const generator: TextGenerator = { generateText: async () => JSON.stringify({ flashcards: [{ id: "card-api", question: "What is an API contract?", answer: "An agreement between client and service.", requirementIds: ["req-api"] }] }) };
  const result = await generateFlashcards(requirements, questions, generator);
  assert.equal(result[0]?.requirementIds[0], "req-api");
  assert.equal(result[0]?.origin, "generated");
});

test("rejects unknown flashcard requirement references", async () => {
  const generator: TextGenerator = { generateText: async () => JSON.stringify({ flashcards: [{ id: "card-api", question: "Question", answer: "Answer", requirementIds: ["req-missing"] }] }) };
  await assert.rejects(() => generateFlashcards(requirements, questions, generator), /unknown requirement/i);
});