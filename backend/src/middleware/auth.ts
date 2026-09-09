import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { getDatabaseState } from "../db/mongoose.js";
import type { AuthenticatedRequest, AuthenticatedUser } from "../types/auth.js";

const assertionLifetimeSeconds = 60;

function sign(payload: string): string {
  return createHmac("sha256", env.AUTH_INTERNAL_SECRET).update(payload).digest("base64url");
}

function parseAssertion(value: string): AuthenticatedUser | null {
  const [encodedPayload, providedSignature] = value.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      sub?: unknown;
      email?: unknown;
      name?: unknown;
      image?: unknown;
      iat?: unknown;
    };
    if (typeof payload.sub !== "string" || typeof payload.iat !== "number") return null;
    if (Math.abs(Math.floor(Date.now() / 1000) - payload.iat) > assertionLifetimeSeconds) return null;

    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof payload.name === "string" ? payload.name : null,
      image: typeof payload.image === "string" ? payload.image : null,
    };
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = async (request, response, next) => {
  const assertion = request.header("authorization")?.replace(/^Bearer\s+/i, "");
  const user = assertion ? parseAssertion(assertion) : null;

  if (!user) {
    response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "A valid user session is required." } });
    return;
  }

  (request as AuthenticatedRequest).user = user;

  if (getDatabaseState() === "connected") {
    await User.findOneAndUpdate(
      { externalId: user.id },
      { $set: { email: user.email, name: user.name, image: user.image } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  next();
};