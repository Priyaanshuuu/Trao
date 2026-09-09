import assert from "node:assert/strict";
import test from "node:test";
import type { CompanyResearchResult } from "../research/companyResearch.js";
import type { TextGenerator } from "../llm/types.js";
import { runInterviewKitPipeline } from "./interviewKitPipeline.js";

const research: CompanyResearchResult = {
  startingUrl: "https://acme.example/",
  sources: [{ url: "https://acme.example/", title: "Acme", text: "Acme builds reliable API products.", links: [] }],
  failures: [],
  hiringSources: [],
  researchGaps: ["No hiring information was found.", "Public interview discussion search is not configured."],
};

test("runs the shared pipeline in order and validates the final kit", async () => {
  const calls: string[] = [];
  const generator: TextGenerator = {
    generateText: async (prompt) => {
      if (prompt.startsWith("Extract")) {
        calls.push("requirements");
        return JSON.stringify({ roleTitle: "Backend Engineer", seniority: "Senior", responsibilities: ["Build APIs"], requirements: [{ id: "req-api", text: "API design", kind: "technical", priority: "must" }] });
      }
      if (prompt.startsWith("Generate interview questions")) {
        calls.push("questions");
        return JSON.stringify({ questions: [{ id: "q-api", prompt: "Design an API.", category: "system-design", difficulty: 2, answerOutline: "Discuss contracts.", requirementIds: ["req-api"] }] });
      }
      calls.push("flashcards");
      return JSON.stringify({ flashcards: [{ id: "card-api", question: "What is an API contract?", answer: "A service agreement.", requirementIds: ["req-api"] }] });
    },
  };

  const result = await runInterviewKitPipeline(
    { id: "kit-acme", jobDescription: "Senior backend engineer responsible for reliable APIs.", companyUrl: "https://acme.example/", days: 2 },
    { generator, research: async () => research },
  );
  assert.deepEqual(calls, ["requirements", "questions", "flashcards"]);
  assert.equal(result.kit.schedule.length, 2);
  assert.deepEqual(result.kit.coverage.uncoveredMustRequirementIds, []);
  assert.equal(result.coverageRepairPasses, 0);
});

test("keeps partial research failures non-fatal", async () => {
  const generator: TextGenerator = {
    generateText: async (prompt) => prompt.startsWith("Extract")
      ? JSON.stringify({ roleTitle: "Engineer", seniority: "Mid", responsibilities: ["Build software"], requirements: [{ id: "req-code", text: "Coding", kind: "technical", priority: "must" }] })
      : prompt.startsWith("Generate interview questions")
        ? JSON.stringify({ questions: [{ id: "q-code", prompt: "Explain your code.", category: "technical", difficulty: 1, answerOutline: "Explain clearly.", requirementIds: ["req-code"] }] })
        : JSON.stringify({ flashcards: [{ id: "card-code", question: "What is coding?", answer: "Writing software.", requirementIds: ["req-code"] }] }),
  };
  const result = await runInterviewKitPipeline(
    { id: "kit-partial", jobDescription: "Mid-level engineer who writes software and tests changes.", companyUrl: "https://acme.example/", days: 1 },
    { generator, research: async () => ({ ...research, sources: [], failures: [{ url: "https://acme.example/", code: "HTTP_503", message: "Source could not be retrieved.", attempts: 3 }], researchGaps: ["No company pages were retrieved."] }) },
  );
  assert.equal(result.kit.companyBrief.summary, "No company summary was retrieved.");
  assert.equal(result.kit.companyBrief.sources.length, 0);
});