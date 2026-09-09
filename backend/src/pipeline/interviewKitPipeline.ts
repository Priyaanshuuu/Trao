import { interviewKitSchema, type InterviewKit } from "../domain/kit.js";
import { extractRequirements } from "../generation/requirements.js";
import { generateQuestions, repairMustCoverage } from "../generation/questions.js";
import { generateFlashcards } from "../generation/flashcards.js";
import { allocateSchedule } from "../planning/schedule.js";
import { researchCompany, type CompanyResearchResult } from "../research/companyResearch.js";
import type { TextGenerator } from "../llm/types.js";

export interface PipelineInput {
  id: string;
  jobDescription: string;
  companyUrl: string;
  days: number;
}

export interface PipelineDependencies {
  generator: TextGenerator;
  research?: (companyUrl: string) => Promise<CompanyResearchResult>;
}

export interface PipelineResult {
  kit: InterviewKit;
  research: CompanyResearchResult;
  coverageRepairPasses: number;
}

function companyBriefFromResearch(research: CompanyResearchResult) {
  const firstSource = research.sources[0];
  return {
    name: new URL(research.startingUrl).hostname,
    summary: firstSource?.text.slice(0, 2_000) || "No company summary was retrieved.",
    products: research.sources
      .flatMap((source) => source.title ? [source.title] : [])
      .filter((title, index, titles) => titles.indexOf(title) === index)
      .slice(0, 10),
    hiringProcess: research.hiringSources.length > 0
      ? "Hiring information was found in the discovered company sources."
      : "No hiring process information was found.",
    researchGaps: research.researchGaps,
    sources: research.sources.map((source) => ({
      url: source.url,
      title: source.title,
      excerpt: source.text.slice(0, 500) || "No text excerpt was available.",
      retrievedAt: new Date().toISOString(),
    })),
  };
}

export async function runInterviewKitPipeline(input: PipelineInput, dependencies: PipelineDependencies): Promise<PipelineResult> {
  const research = await (dependencies.research ?? researchCompany)(input.companyUrl);
  const extraction = await extractRequirements(input.jobDescription, dependencies.generator);
  const researchContext = research.sources.map((source) => `${source.title}: ${source.text}`).join("\n").slice(0, 30_000);
  const initialQuestions = await generateQuestions(extraction.requirements, dependencies.generator, researchContext);
  const repaired = await repairMustCoverage(extraction.requirements, initialQuestions, dependencies.generator, researchContext);
  const flashcards = await generateFlashcards(extraction.requirements, repaired.questions, dependencies.generator);
  const schedule = allocateSchedule(extraction.requirements, repaired.questions, input.days);

  const candidate = {
    id: input.id,
    requestedDays: input.days,
    companyBrief: companyBriefFromResearch(research),
    roleBreakdown: {
      title: extraction.roleTitle,
      seniority: extraction.seniority,
      responsibilities: extraction.responsibilities,
    },
    requirements: extraction.requirements,
    questions: repaired.questions,
    flashcards,
    schedule,
    coverage: repaired.coverage,
  };
  const parsed = interviewKitSchema.safeParse(candidate);
  if (!parsed.success) throw new Error(`Generated kit failed final validation: ${parsed.error.message}`);
  return { kit: parsed.data, research, coverageRepairPasses: repaired.passes };
}