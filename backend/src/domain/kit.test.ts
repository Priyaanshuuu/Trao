import assert from "node:assert/strict";
import test from "node:test";
import { interviewKitSchema } from "./kit.js";

const validKit = {
  id: "kit-backend-role",
  requestedDays: 1,
  companyBrief: {
    name: "Acme",
    summary: "A software company.",
    products: ["Platform"],
    hiringProcess: "No hiring process information found.",
    researchGaps: [],
    sources: [],
  },
  roleBreakdown: {
    title: "Backend Engineer",
    seniority: "Senior",
    responsibilities: ["Build APIs"],
  },
  requirements: [{ id: "req-api-design", text: "API design", kind: "technical", priority: "must", origin: "generated", edited: false, pinned: false }],
  questions: [{ id: "q-api-design", prompt: "Design an API.", category: "technical", difficulty: 2, answerOutline: "Discuss contracts and trade-offs.", requirementIds: ["req-api-design"], origin: "generated", edited: false, pinned: false }],
  flashcards: [{ id: "card-api-design", question: "What is API design?", answer: "A contract between clients and services.", requirementIds: ["req-api-design"], origin: "generated", edited: false, pinned: false }],
  schedule: [{ day: 1, focus: "API design", questionIds: ["q-api-design"], minutes: 45 }],
  coverage: { coveredRequirementIds: ["req-api-design"], uncoveredMustRequirementIds: [] },
};

test("accepts a structurally valid interview kit", () => {
  assert.equal(interviewKitSchema.safeParse(validKit).success, true);
});

test("rejects invalid references, difficulty, and schedule minutes", () => {
  const result = interviewKitSchema.safeParse({
    ...validKit,
    questions: [{ ...validKit.questions[0], difficulty: 4, requirementIds: ["req-missing"] }],
    schedule: [{ day: 1, focus: "API design", questionIds: ["q-missing"], minutes: 12.5 }],
  });
  assert.equal(result.success, false);
});

test("rejects a schedule with the wrong number of days", () => {
  const result = interviewKitSchema.safeParse({ ...validKit, requestedDays: 2 });
  assert.equal(result.success, false);
});

test("rejects schedule day gaps", () => {
  const result = interviewKitSchema.safeParse({
    ...validKit,
    requestedDays: 2,
    schedule: [validKit.schedule[0], { day: 3, focus: "Review", questionIds: [], minutes: 30 }],
  });
  assert.equal(result.success, false);
});