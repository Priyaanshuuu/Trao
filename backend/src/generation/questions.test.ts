import assert from "node:assert/strict";
import test from "node:test";
import { calculateCoverage, generateQuestions, repairMustCoverage } from "./questions.js";
import type { Question, Requirement } from "../domain/kit.js";
import type { TextGenerator } from "../llm/types.js";

const requirements: Requirement[] = [
  { id: "req-api", text: "API design", kind: "technical", priority: "must", origin: "generated", edited: false, pinned: false },
  { id: "req-testing", text: "Testing", kind: "technical", priority: "must", origin: "generated", edited: false, pinned: false },
  { id: "req-teamwork", text: "Teamwork", kind: "behavioural", priority: "nice", origin: "generated", edited: false, pinned: false },
];

function question(id: string, requirementIds: string[], edited = false): Question {
  return { id, prompt: `Discuss ${id}`, category: "technical", difficulty: 2, answerOutline: "Discuss trade-offs.", requirementIds, origin: edited ? "user" : "generated", edited, pinned: edited };
}

test("calculates covered and uncovered must requirements deterministically", () => {
  const result = calculateCoverage(requirements, [question("q-api", ["req-api", "req-teamwork"])]);
  assert.deepEqual(result.coveredRequirementIds, ["req-api", "req-teamwork"]);
  assert.deepEqual(result.uncoveredMustRequirementIds, ["req-testing"]);
});

test("generates categorized questions with valid requirement references", async () => {
  const generator: TextGenerator = {
    generateText: async () => JSON.stringify({ questions: [{ id: "q-api", prompt: "Design an API.", category: "system-design", difficulty: 3, answerOutline: "Discuss contracts.", requirementIds: ["req-api"] }] }),
  };
  const result = await generateQuestions(requirements, generator, "The company builds APIs.");
  assert.equal(result[0]?.category, "system-design");
  assert.equal(result[0]?.origin, "generated");
});

test("rejects generated questions with unknown requirement references", async () => {
  const generator: TextGenerator = {
    generateText: async () => JSON.stringify({ questions: [{ id: "q-unknown", prompt: "Question", category: "technical", difficulty: 1, answerOutline: "Answer", requirementIds: ["req-missing"] }] }),
  };
  await assert.rejects(() => generateQuestions(requirements, generator), /unknown requirement/i);
});

test("repairs uncovered must requirements without replacing edited questions", async () => {
  let calls = 0;
  const editedQuestion = question("q-api", ["req-api"], true);
  const generator: TextGenerator = {
    generateText: async () => {
      calls += 1;
      return JSON.stringify({ questions: [{ id: "q-testing", prompt: "How do you test?", category: "technical", difficulty: 2, answerOutline: "Discuss test strategy.", requirementIds: ["req-testing"] }] });
    },
  };
  const result = await repairMustCoverage(requirements, [editedQuestion], generator);
  assert.equal(result.passes, 1);
  assert.deepEqual(result.coverage.uncoveredMustRequirementIds, []);
  assert.equal(result.questions[0]?.edited, true);
  assert.equal(result.questions.length, 2);
  assert.equal(calls, 1);
});

test("does not call the model when coverage is already complete", async () => {
  let calls = 0;
  const generator: TextGenerator = { generateText: async () => { calls += 1; return "{}"; } };
  const result = await repairMustCoverage(requirements, [question("q-all", ["req-api", "req-testing"])], generator);
  assert.equal(result.passes, 0);
  assert.equal(calls, 0);
});