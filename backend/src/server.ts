import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./db/mongoose.js";

const app = createApp();

async function startServer() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.info(`Backend listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});