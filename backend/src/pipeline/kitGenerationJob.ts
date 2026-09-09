import { GeminiClient } from "../llm/gemini.js";
import { Kit } from "../models/Kit.js";
import { runInterviewKitPipeline } from "./interviewKitPipeline.js";

function failureDetails(error: unknown): { code: string; message: string } {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : "GENERATION_FAILED";
  const message = error instanceof Error ? error.message : "Kit generation failed.";
  return { code, message };
}

export async function generateKitInBackground(kitId: string): Promise<void> {
  const kit = await Kit.findOneAndUpdate(
    { _id: kitId, status: "pending" },
    { $set: { status: "running", error: null } },
    { new: true },
  );
  if (!kit) return;

  try {
    const result = await runInterviewKitPipeline(
      {
        id: `kit-${kit._id.toString()}`,
        jobDescription: kit.jobDescription,
        companyUrl: kit.companyUrl,
        days: kit.requestedDays,
      },
      { generator: new GeminiClient() },
    );
    await Kit.updateOne(
      { _id: kit._id, status: "running" },
      { $set: { status: "completed", kit: result.kit, error: null } },
    );
  } catch (error) {
    await Kit.updateOne(
      { _id: kit._id, status: "running" },
      { $set: { status: "failed", error: failureDetails(error) } },
    );
    console.error(`Kit generation failed for ${kit._id.toString()}`, error);
  }
}