import type { Question, Requirement } from "../domain/kit.js";
import type { z } from "zod";
import { scheduleDaySchema } from "../domain/kit.js";

export type ScheduleDay = z.infer<typeof scheduleDaySchema>;

function questionPriority(question: Question, requirementsById: Map<string, Requirement>): number {
  const highestRequirementPriority = question.requirementIds.some((id) => requirementsById.get(id)?.priority === "must") ? 2 : 1;
  return highestRequirementPriority * 10 + question.difficulty;
}

function questionMinutes(question: Question, requirementsById: Map<string, Requirement>): number {
  const mustHave = question.requirementIds.some((id) => requirementsById.get(id)?.priority === "must");
  return 10 + question.difficulty * 10 + (mustHave ? 5 : 0);
}

export function allocateSchedule(requirements: Requirement[], questions: Question[], requestedDays: number): ScheduleDay[] {
  if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 60) throw new Error("Requested days must be an integer between 1 and 60");
  const requirementsById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const orderedQuestions = [...questions].sort((left, right) => questionPriority(right, requirementsById) - questionPriority(left, requirementsById));
  const days: ScheduleDay[] = Array.from({ length: requestedDays }, (_, index) => ({ day: index + 1, focus: "Review and consolidation", questionIds: [], minutes: 0 }));

  orderedQuestions.forEach((question, index) => {
    const day = days[index % requestedDays]!;
    day.questionIds.push(question.id);
    day.minutes += questionMinutes(question, requirementsById);
  });

  for (const day of days) {
    if (day.questionIds.length > 0) day.focus = `Practice ${day.questionIds.length} prioritized question${day.questionIds.length === 1 ? "" : "s"}`;
  }
  return days;
}