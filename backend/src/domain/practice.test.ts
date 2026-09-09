import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

const practiceUpdateSchema = z.object({
  flashcardId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  confidence: z.number().int().min(1).max(3).nullable().optional(),
  completed: z.boolean().optional(),
}).refine((value) => value.confidence !== undefined || value.completed !== undefined);

test("accepts confidence and completion updates", () => {
  assert.equal(practiceUpdateSchema.safeParse({ flashcardId: "card-api", confidence: 2, completed: true }).success, true);
});

test("rejects invalid confidence and empty updates", () => {
  assert.equal(practiceUpdateSchema.safeParse({ flashcardId: "card-api", confidence: 4 }).success, false);
  assert.equal(practiceUpdateSchema.safeParse({ flashcardId: "card-api" }).success, false);
});