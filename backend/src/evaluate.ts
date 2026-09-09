import { readFile, writeFile } from "node:fs/promises";
import { OpenAiClient } from "./llm/openai.js";
import { runInterviewKitPipeline, type PipelineDependencies } from "./pipeline/interviewKitPipeline.js";
import { z } from "zod";

const evaluationCaseSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(20).max(50_000),
  company_url: z.string().url(),
  days: z.coerce.number().int().min(1).max(60),
});

const evaluationInputSchema = z.array(evaluationCaseSchema);

export interface EvaluationCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface EvaluationResult {
  id: string;
  status: "ok" | "failed";
  kit: unknown;
  error: { code: string; message: string } | null;
}

export interface EvaluationOutput {
  version: "1.0";
  generated_at: string;
  kits: EvaluationResult[];
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown pipeline failure";
  if (/URL_PRIVATE_DESTINATION|URL_INVALID|URL_PROTOCOL_UNSUPPORTED/.test(message)) return "INVALID_COMPANY_URL";
  if (/HTTP_|FETCH_FAILED|could not be retrieved|unreachable/i.test(message)) return "COMPANY_UNREACHABLE";
  if (/LLM_NOT_CONFIGURED/.test(message)) return "LLM_NOT_CONFIGURED";
  if (/LLM_/.test(message)) return "GENERATION_FAILED";
  if (/validation|schema/i.test(message)) return "KIT_INVALID";
  return "PIPELINE_FAILED";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The case could not be completed.";
}

export async function runBatch(cases: EvaluationCase[], dependencies: PipelineDependencies): Promise<EvaluationOutput> {
  const kits: EvaluationResult[] = [];
  for (const evaluationCase of cases) {
    try {
      const result = await runInterviewKitPipeline({ id: evaluationCase.id, jobDescription: evaluationCase.jd, companyUrl: evaluationCase.company_url, days: evaluationCase.days }, dependencies);
      kits.push({ id: evaluationCase.id, status: "ok", kit: result.kit, error: null });
    } catch (error) {
      kits.push({ id: evaluationCase.id, status: "failed", kit: null, error: { code: errorCode(error), message: errorMessage(error) } });
    }
  }
  return { version: "1.0", generated_at: new Date().toISOString(), kits };
}

function argumentValue(args: string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) throw new Error(`Missing required argument: ${flag}`);
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = argumentValue(args, "--input");
  const outputPath = argumentValue(args, "--output");
  const parsedInput = evaluationInputSchema.safeParse(JSON.parse(await readFile(inputPath, "utf8")));
  if (!parsedInput.success) throw new Error(`Invalid evaluation input: ${parsedInput.error.message}`);

  const output = await runBatch(parsedInput.data, { generator: new OpenAiClient() });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

if (/evaluate\.(ts|js)$/.test(process.argv[1] ?? "")) {
  main().catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}