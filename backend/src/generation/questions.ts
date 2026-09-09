import { z } from "zod";
import type { Question, Requirement } from "../domain/kit.js";
import { generateStructured } from "../llm/structured.js";
import type { TextGenerator } from "../llm/types.js";

const questionOutputSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  prompt: z.string().min(1),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  difficulty: z.number().int().min(1).max(3),
  answerOutline: z.string().min(1),
  requirementIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).min(1),
});

const questionOutputListSchema = z.object({
  questions: z.array(questionOutputSchema).min(1),
}).superRefine((output, context) => {
  const ids = new Set<string>();
  for (const question of output.questions) {
    if (ids.has(question.id)) context.addIssue({ code: "custom", path: ["questions"], message: `Duplicate question id: ${question.id}` });
    ids.add(question.id);
  }
});

export interface CoverageResult {
  coveredRequirementIds: string[];
  uncoveredMustRequirementIds: string[];
}

export interface CoverageRepairResult {
  questions: Question[];
  coverage: CoverageResult;
  passes: number;
}

function buildPrompt(requirements: Requirement[], researchContext: string, onlyRequirementIds?: string[]): string {
  const selectedRequirements = onlyRequirementIds
    ? requirements.filter((requirement) => onlyRequirementIds.includes(requirement.id))
    : requirements;
  return `Generate interview questions from the structured requirements below.

Rules:
- Use only the supplied requirements and research context as source data.
- Every question must reference one or more supplied requirement IDs.
- Use categories technical, behavioural, system-design, or company-fit.
- Do not invent requirement IDs or claim coverage for requirements not listed.
- Create concise stable lowercase question IDs.
- Return only JSON shaped as { "questions": [{ "id": string, "prompt": string, "category": string, "difficulty": 1 | 2 | 3, "answerOutline": string, "requirementIds": string[] }] }.

REQUIREMENTS START
${JSON.stringify(selectedRequirements)}
REQUIREMENTS END

RESEARCH CONTEXT START
${researchContext || "No additional research context is available."}
RESEARCH CONTEXT END`;
}

function withGeneratedState(question: z.infer<typeof questionOutputSchema>): Question {
  return { ...question, origin: "generated", edited: false, pinned: false };
}

export async function generateQuestions(
  requirements: Requirement[],
  generator: TextGenerator,
  researchContext = "",
  onlyRequirementIds?: string[],
): Promise<Question[]> {
  if (requirements.length === 0) throw new Error("At least one requirement is needed to generate questions");
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  const selectedIds = onlyRequirementIds ?? requirements.map((requirement) => requirement.id);
  if (selectedIds.some((id) => !requirementIds.has(id))) throw new Error("Question generation received an unknown requirement ID");

  const output = await generateStructured(generator, buildPrompt(requirements, researchContext, selectedIds), questionOutputListSchema);
  for (const question of output.questions) {
    if (question.requirementIds.some((id) => !requirementIds.has(id))) throw new Error("Generated question referenced an unknown requirement ID");
    if (onlyRequirementIds && question.requirementIds.every((id) => !onlyRequirementIds.includes(id))) {
      throw new Error("Coverage repair generated a question for an unrelated requirement");
    }
  }
  return output.questions.map(withGeneratedState);
}

export function calculateCoverage(requirements: Requirement[], questions: Question[]): CoverageResult {
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  const covered = new Set<string>();
  for (const question of questions) {
    for (const requirementId of question.requirementIds) {
      if (requirementIds.has(requirementId)) covered.add(requirementId);
    }
  }
  return {
    coveredRequirementIds: [...covered],
    uncoveredMustRequirementIds: requirements
      .filter((requirement) => requirement.priority === "must" && !covered.has(requirement.id))
      .map((requirement) => requirement.id),
  };
}

export function mergeQuestions(existing: Question[], additions: Question[]): Question[] {
  const existingIds = new Set(existing.map((question) => question.id));
  return [...existing, ...additions.filter((question) => !existingIds.has(question.id))];
}

export async function repairMustCoverage(
  requirements: Requirement[],
  initialQuestions: Question[],
  generator: TextGenerator,
  researchContext = "",
): Promise<CoverageRepairResult> {
  let questions = [...initialQuestions];
  let coverage = calculateCoverage(requirements, questions);
  if (coverage.uncoveredMustRequirementIds.length === 0) return { questions, coverage, passes: 0 };

  const additions = await generateQuestions(requirements, generator, researchContext, coverage.uncoveredMustRequirementIds);
  questions = mergeQuestions(questions, additions);
  coverage = calculateCoverage(requirements, questions);
  return { questions, coverage, passes: 1 };
}