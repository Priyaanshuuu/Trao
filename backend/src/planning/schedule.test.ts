import assert from "node:assert/strict";
import test from "node:test";
import { allocateSchedule } from "./schedule.js";
import type { Question, Requirement } from "../domain/kit.js";

const requirements: Requirement[] = [
  { id: "req-hard", text: "Distributed systems", kind: "technical", priority: "must", origin: "generated", edited: false, pinned: false },
  { id: "req-soft", text: "Communication", kind: "behavioural", priority: "nice", origin: "generated", edited: false, pinned: false },
];
const questions: Question[] = [
  { id: "q-easy", prompt: "Easy", category: "technical", difficulty: 1, answerOutline: "Answer", requirementIds: ["req-soft"], origin: "generated", edited: false, pinned: false },
  { id: "q-hard", prompt: "Hard", category: "system-design", difficulty: 3, answerOutline: "Answer", requirementIds: ["req-hard"], origin: "generated", edited: false, pinned: false },
  { id: "q-medium", prompt: "Medium", category: "technical", difficulty: 2, answerOutline: "Answer", requirementIds: ["req-hard"], origin: "generated", edited: false, pinned: false },
];

test("allocates exactly requested days with integer minutes and prioritizes must-hard material", () => {
  const schedule = allocateSchedule(requirements, questions, 2);
  assert.equal(schedule.length, 2);
  assert.equal(schedule[0]?.questionIds[0], "q-hard");
  assert.ok(schedule.every((day) => Number.isInteger(day.minutes)));
  assert.deepEqual(new Set(schedule.flatMap((day) => day.questionIds)), new Set(questions.map((question) => question.id)));
});

test("supports one day and large day counts", () => {
  assert.equal(allocateSchedule(requirements, questions, 1).length, 1);
  const schedule = allocateSchedule(requirements, questions, 60);
  assert.equal(schedule.length, 60);
  assert.ok(schedule.every((day, index) => day.day === index + 1 && typeof day.focus === "string"));
});

test("rejects invalid day counts", () => {
  assert.throws(() => allocateSchedule(requirements, questions, 0), /between 1 and 60/);
  assert.throws(() => allocateSchedule(requirements, questions, 61), /between 1 and 60/);
});