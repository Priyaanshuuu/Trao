import cors from "cors";
import express from "express";
import { getDatabaseState } from "./db/mongoose.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import type { AuthenticatedRequest } from "./types/auth.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}