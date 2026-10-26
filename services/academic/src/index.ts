import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadAcademicPackage } from "@acadflow/proto";
import { createGrpcServer, createLogger } from "@acadflow/rpc-wrapper";
import { DEFAULT_PORTS, envInt } from "@acadflow/shared";
import type * as grpc from "@grpc/grpc-js";
import { academicHandlers } from "./handlers.js";
import { prisma } from "./db.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(root, ".env") });

const logger = createLogger("academic");

async function main() {
  const pkg = loadAcademicPackage() as unknown as {
    acadflow: {
      academic: {
        AcademicService: { service: grpc.ServiceDefinition };
      };
    };
  };

  const port = envInt("ACADEMIC_GRPC_PORT", DEFAULT_PORTS.academicGrpc);

  const handle = await createGrpcServer({
    serviceName: "academic",
    port,
    serviceDefinition: pkg.acadflow.academic.AcademicService.service,
    implementation: academicHandlers,
    logger,
  });

  const shutdown = async () => {
    await handle.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  logger.error("Failed to start academic service", error);
  process.exit(1);
});
