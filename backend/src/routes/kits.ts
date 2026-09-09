import { randomUUID } from "node:crypto";
import type { HydratedDocument } from "mongoose";
import type { RequestHandler, Router } from "express";
import { Router as createRouter } from "express";
import { Kit } from "../models/Kit.js";
import type { KitDocument } from "../models/Kit.js";
import { createKitRequestSchema } from "../domain/kitRequest.js";
import type { AuthenticatedRequest } from "../types/auth.js";

function currentUserId(request: Parameters<RequestHandler>[0]): string {
  return (request as AuthenticatedRequest).user.id;
}

function serializeKit(kit: HydratedDocument<KitDocument> | null) {
  if (!kit) return null;
  return {
    id: kit._id.toString(),
    jobDescription: kit.jobDescription,
    companyUrl: kit.companyUrl,
    requestedDays: kit.requestedDays,
    status: kit.status,
    kit: kit.kit,
    error: kit.error,
    createdAt: kit.createdAt,
    updatedAt: kit.updatedAt,
  };
}

export function createKitRouter(): Router {
  const router = createRouter();

  router.post("/", async (request, response, next) => {
    try {
      const parsed = createKitRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: { code: "INVALID_KIT_REQUEST", message: "Job description, company URL, and days are invalid.", details: parsed.error.flatten().fieldErrors } });
        return;
      }

      const userId = currentUserId(request);
      const existing = await Kit.findOne({
        ownerExternalId: userId,
        status: { $in: ["pending", "running"] },
        jobDescription: parsed.data.jobDescription,
        companyUrl: parsed.data.companyUrl,
      });
      if (existing) {
        response.status(409).json({ error: { code: "DUPLICATE_GENERATION", message: "This kit is already being generated.", kitId: existing.id } });
        return;
      }

      const kit = await Kit.create({
        _id: randomUUID(),
        ownerExternalId: userId,
        jobDescription: parsed.data.jobDescription,
        companyUrl: parsed.data.companyUrl,
        requestedDays: parsed.data.days,
        status: "pending",
      });
      response.status(202).json({ kit: serializeKit(kit) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (request, response, next) => {
    try {
      const kits = await Kit.find({ ownerExternalId: currentUserId(request) }).sort({ createdAt: -1 });
      response.json({ kits: kits.map(serializeKit) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const kit = await Kit.findOne({ _id: request.params.id, ownerExternalId: currentUserId(request) });
      if (!kit) {
        response.status(404).json({ error: { code: "KIT_NOT_FOUND", message: "Kit not found." } });
        return;
      }
      response.json({ kit: serializeKit(kit) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const deleted = await Kit.findOneAndDelete({ _id: request.params.id, ownerExternalId: currentUserId(request) });
      if (!deleted) {
        response.status(404).json({ error: { code: "KIT_NOT_FOUND", message: "Kit not found." } });
        return;
      }
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}