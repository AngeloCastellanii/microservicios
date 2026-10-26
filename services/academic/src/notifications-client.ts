import {
  loadNotificationsPackage,
} from "@acadflow/proto";
import { createGrpcClient, createLogger } from "@acadflow/rpc-wrapper";
import { DEFAULT_PORTS, envInt } from "@acadflow/shared";
import type * as grpc from "@grpc/grpc-js";

const logger = createLogger("academic→notifications");

type NotificationClient = grpc.Client & {
  CreateNotification: unknown;
};

let client: ReturnType<typeof createGrpcClient<NotificationClient>> | null =
  null;

export function getNotificationsClient() {
  if (client) return client;

  const pkg = loadNotificationsPackage() as unknown as {
    acadflow: {
      notifications: {
        NotificationService: new (
          address: string,
          credentials: grpc.ChannelCredentials,
        ) => NotificationClient;
      };
    };
  };

  const port = envInt("NOTIFICATIONS_GRPC_PORT", DEFAULT_PORTS.notificationsGrpc);
  const host = process.env.NOTIFICATIONS_GRPC_HOST ?? "127.0.0.1";

  client = createGrpcClient<NotificationClient>({
    serviceName: "notifications",
    address: `${host}:${port}`,
    ClientConstructor: pkg.acadflow.notifications.NotificationService,
    logger,
  });

  return client;
}

export async function createPersistentReminder(input: {
  title: string;
  body: string;
  relatedItemId: string;
}): Promise<void> {
  try {
    const c = getNotificationsClient() as {
      CreateNotification: (req: {
        kind: string;
        title: string;
        body: string;
        relatedItemId: string;
      }) => Promise<unknown>;
    };
    await c.CreateNotification({
      kind: "PERSISTENT",
      title: input.title,
      body: input.body,
      relatedItemId: input.relatedItemId,
    });
  } catch (error) {
    logger.warn("No se pudo crear notificación (¿notifications caído?)", error);
  }
}
