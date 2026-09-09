import { z } from "zod";

export const createKitRequestSchema = z.object({
  jobDescription: z.string().trim().min(20).max(50_000),
  companyUrl: z.string().trim().url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Company URL must use HTTP or HTTPS"),
  days: z.coerce.number().int().min(1).max(60),
});

export type CreateKitRequest = z.infer<typeof createKitRequestSchema>;