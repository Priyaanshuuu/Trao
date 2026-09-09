import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { getDatabaseState } from "./db/mongoose.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import type { AuthenticatedRequest } from "./types/auth.js";
import { createKitRouter } from "./routes/kits.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  app.use(rateLimit({ windowMs: env.API_RATE_LIMIT_WINDOW_MS, limit: env.API_RATE_LIMIT_MAX, standardHeaders: "draft-7", legacyHeaders: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use((request, _response, next) => {
    const startedAt = Date.now();
    next();
    console.info(`${request.method} ${request.originalUrl} ${Date.now() - startedAt}ms`);
  });

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "backend",
      database: getDatabaseState(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/me", requireAuth, (request, response) => {
    const { user } = request as AuthenticatedRequest;
    response.json({ user });
  });

  app.use("/api/kits", requireAuth, createKitRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}