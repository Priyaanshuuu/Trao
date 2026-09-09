import mongoose from "mongoose";
import { env } from "../config/env.js";

export type DatabaseState = "not_configured" | "connected" | "disconnected";

let databaseState: DatabaseState = env.MONGODB_URI ? "disconnected" : "not_configured";

export function getDatabaseState(): DatabaseState {
  return databaseState;
}

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) return;

  await mongoose.connect(env.MONGODB_URI);
  databaseState = "connected";
}

export async function disconnectDatabase(): Promise<void> {
  if (databaseState !== "connected") return;

  await mongoose.disconnect();
  databaseState = "disconnected";
}