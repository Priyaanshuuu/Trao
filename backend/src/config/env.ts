import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1).optional(),
  AUTH_INTERNAL_SECRET: z.string().min(32),
  LLM_PROVIDER: z.enum(["google-gemini"]).default("google-gemini"),
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).default("gemini-3.6-flash"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment configuration", parsedEnvironment.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnvironment.data;