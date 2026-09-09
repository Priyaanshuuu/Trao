import { z } from "zod";

const stableId = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/, "Must be a stable lowercase identifier");
const generatedState = z.object({
  origin: z.enum(["generated", "user"]),
  edited: z.boolean(),
  pinned: z.boolean(),
});

const source = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  retrievedAt: z.string().datetime(),
});

export const companyBriefSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  products: z.array(z.string().min(1)),
  hiringProcess: z.string().min(1),
  researchGaps: z.array(z.string().min(1)),
  sources: z.array(source),
});

export const roleBreakdownSchema = z.object({
  title: z.string().min(1),
  seniority: z.string().min(1),
  responsibilities: z.array(z.string().min(1)),
});

export const requirementSchema = generatedState.extend({
  id: stableId,
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

export const questionSchema = generatedState.extend({
  id: stableId,
  prompt: z.string().min(1),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  difficulty: z.number().int().min(1).max(3),
  answerOutline: z.string().min(1),
  requirementIds: z.array(stableId).min(1),
});

export const flashcardSchema = generatedState.extend({
  id: stableId,
  question: z.string().min(1),
  answer: z.string().min(1),
  requirementIds: z.array(stableId),
});

export const scheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string().min(1),
  questionIds: z.array(stableId),
  minutes: z.number().int().nonnegative(),
});

export const coverageSchema = z.object({
  coveredRequirementIds: z.array(stableId),
  uncoveredMustRequirementIds: z.array(stableId),
});

export const interviewKitSchema = z.object({
  id: stableId,
  requestedDays: z.number().int().positive(),
  companyBrief: companyBriefSchema,
  roleBreakdown: roleBreakdownSchema,
  requirements: z.array(requirementSchema),
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: z.array(scheduleDaySchema),
  coverage: coverageSchema,
}).superRefine((kit, context) => {
  const requirementIds = new Set<string>();
  for (const requirement of kit.requirements) {
    if (requirementIds.has(requirement.id)) {
      context.addIssue({ code: "custom", path: ["requirements"], message: `Duplicate requirement id: ${requirement.id}` });
    }
    requirementIds.add(requirement.id);
  }

  const questionIds = new Set<string>();
  for (const question of kit.questions) {
    if (questionIds.has(question.id)) {
      context.addIssue({ code: "custom", path: ["questions"], message: `Duplicate question id: ${question.id}` });
    }
    questionIds.add(question.id);
    for (const requirementId of question.requirementIds) {
      if (!requirementIds.has(requirementId)) {
        context.addIssue({ code: "custom", path: ["questions"], message: `Unknown requirement reference: ${requirementId}` });
      }
    }
  }

  for (const flashcard of kit.flashcards) {
    for (const requirementId of flashcard.requirementIds) {
      if (!requirementIds.has(requirementId)) {
        context.addIssue({ code: "custom", path: ["flashcards"], message: `Unknown requirement reference: ${requirementId}` });
      }
    }
  }

  for (const day of kit.schedule) {
    for (const questionId of day.questionIds) {
      if (!questionIds.has(questionId)) {
        context.addIssue({ code: "custom", path: ["schedule"], message: `Unknown question reference: ${questionId}` });
      }
    }
  }

  const scheduleDays = new Set(kit.schedule.map((day) => day.day));
  const hasExpectedDayNumbers = Array.from({ length: kit.requestedDays }, (_, index) => index + 1)
    .every((dayNumber) => scheduleDays.has(dayNumber));
  if (kit.schedule.length !== kit.requestedDays || scheduleDays.size !== kit.requestedDays || !hasExpectedDayNumbers) {
    context.addIssue({ code: "custom", path: ["schedule"], message: "Schedule must contain exactly one entry for every requested day" });
  }

  for (const requirementId of kit.coverage.coveredRequirementIds) {
    if (!requirementIds.has(requirementId)) {
      context.addIssue({ code: "custom", path: ["coverage"], message: `Unknown covered requirement: ${requirementId}` });
    }
  }
  for (const requirementId of kit.coverage.uncoveredMustRequirementIds) {
    if (!requirementIds.has(requirementId)) {
      context.addIssue({ code: "custom", path: ["coverage"], message: `Unknown uncovered requirement: ${requirementId}` });
    }
  }
});

export type InterviewKit = z.infer<typeof interviewKitSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type Question = z.infer<typeof questionSchema>;