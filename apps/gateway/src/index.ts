import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { createLogger } from "@studyy/rpc-wrapper";
import { DEFAULT_PORTS, envInt } from "@studyy/shared";
import { registerRoutes } from "./routes.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({ path: path.join(root, ".env") });

const logger = createLogger("gateway");

async function main() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  await registerRoutes(app);

  const port = envInt("GATEWAY_PORT", DEFAULT_PORTS.gateway);
  await app.listen({ port, host: "0.0.0.0" });
  logger.info(`HTTP gateway on http://localhost:${port}`);
}

main().catch((error) => {
  logger.error("Failed to start gateway", error);
  process.exit(1);
});
