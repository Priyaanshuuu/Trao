import { z } from "zod";
import type { Flashcard, Question, Requirement } from "../domain/kit.js";
import { generateStructured } from "../llm/structured.js";
import type { TextGenerator } from "../llm/types.js";

const flashcardOutputSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  question: z.string().min(1),
  answer: z.string().min(1),
  requirementIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)),
});

const flashcardListSchema = z.object({
  flashcards: z.array(flashcardOutputSchema).min(1),
}).superRefine((output, context) => {
  const ids = new Set<string>();
  for (const flashcard of output.flashcards) {
    if (ids.has(flashcard.id)) context.addIssue({ code: "custom", path: ["flashcards"], message: `Duplicate flashcard id: ${flashcard.id}` });
    ids.add(flashcard.id);
  }
});

export async function generateFlashcards(requirements: Requirement[], questions: Question[], generator: TextGenerator): Promise<Flashcard[]> {
  if (questions.length === 0) throw new Error("At least one question is needed to generate flashcards");
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  const prompt = `Generate concise interview-preparation flashcards from the supplied requirements and questions.

Rules:
- Use only the supplied source data.
- Preserve requirement references where applicable; every referenced ID must be supplied.
- Return only JSON shaped as { "flashcards": [{ "id": string, "question": string, "answer": string, "requirementIds": string[] }] }.

REQUIREMENTS START
${JSON.stringify(requirements)}
REQUIREMENTS END

QUESTIONS START
${JSON.stringify(questions)}
QUESTIONS END`;
  const output = await generateStructured(generator, prompt, flashcardListSchema);
  for (const flashcard of output.flashcards) {
    if (flashcard.requirementIds.some((id) => !requirementIds.has(id))) throw new Error("Generated flashcard referenced an unknown requirement ID");
  }
  return output.flashcards.map((flashcard) => ({ ...flashcard, origin: "generated" as const, edited: false, pinned: false }));
}