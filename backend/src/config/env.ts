import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1).optional(),
  AUTH_INTERNAL_SECRET: z.string().min(32),
  LLM_PROVIDER: z.enum(["groq"]).default("groq"),
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).default("llama-3.1-8b-instant"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(4096).default(2048),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment configuration", parsedEnvironment.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnvironment.data;