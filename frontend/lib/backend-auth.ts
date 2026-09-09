import { createHmac } from "node:crypto";
import { auth } from "@/auth";

function requiredEnvironment(name: "AUTH_INTERNAL_SECRET" | "BACKEND_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function authenticatedBackendFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await auth();
  if (!session?.user) throw new Error("A signed-in session is required");

  const userId = session.user.email ?? session.user.name;
  if (!userId) throw new Error("The signed-in user has no stable identity");

  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    iat: Math.floor(Date.now() / 1000),
  })).toString("base64url");
  const signature = createHmac("sha256", requiredEnvironment("AUTH_INTERNAL_SECRET")).update(payload).digest("base64url");

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${payload}.${signature}`);
  return fetch(`${requiredEnvironment("BACKEND_URL")}${path}`, { ...init, headers, cache: "no-store" });
}