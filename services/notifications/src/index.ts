import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadNotificationsPackage } from "@acadflow/proto";
import { createGrpcServer, createLogger } from "@acadflow/rpc-wrapper";
import { DEFAULT_PORTS, envInt } from "@acadflow/shared";
import type * as grpc from "@grpc/grpc-js";
import { prisma } from "./db.js";
import { notificationHandlers } from "./handlers.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({ path: path.join(root, ".env") });

const logger = createLogger("notifications");

async function main() {
  const pkg = loadNotificationsPackage() as unknown as {
    acadflow: {
      notifications: {
        NotificationService: { service: grpc.ServiceDefinition };
      };
    };
  };

  const port = envInt(
    "NOTIFICATIONS_GRPC_PORT",
    DEFAULT_PORTS.notificationsGrpc,
  );

  const handle = await createGrpcServer({
    serviceName: "notifications",
    port,
    serviceDefinition: pkg.acadflow.notifications.NotificationService.service,
    implementation: notificationHandlers,
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
  logger.error("Failed to start notifications service", error);
  process.exit(1);
});
