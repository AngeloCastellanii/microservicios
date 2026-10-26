import {
  loadAcademicPackage,
  loadNotificationsPackage,
} from "@acadflow/proto";
import { createGrpcClient, createLogger } from "@acadflow/rpc-wrapper";
import { DEFAULT_PORTS, envInt } from "@acadflow/shared";
import type * as grpc from "@grpc/grpc-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = grpc.Client & Record<string, any>;

const academicPkg = loadAcademicPackage() as unknown as {
  acadflow: {
    academic: {
      AcademicService: new (
        address: string,
        credentials: grpc.ChannelCredentials,
      ) => AnyClient;
    };
  };
};

const notificationsPkg = loadNotificationsPackage() as unknown as {
  acadflow: {
    notifications: {
      NotificationService: new (
        address: string,
        credentials: grpc.ChannelCredentials,
      ) => AnyClient;
    };
  };
};

const academicPort = envInt("ACADEMIC_GRPC_PORT", DEFAULT_PORTS.academicGrpc);
const notificationsPort = envInt(
  "NOTIFICATIONS_GRPC_PORT",
  DEFAULT_PORTS.notificationsGrpc,
);
const academicHost = process.env.ACADEMIC_GRPC_HOST ?? "127.0.0.1";
const notificationsHost = process.env.NOTIFICATIONS_GRPC_HOST ?? "127.0.0.1";

export const academic = createGrpcClient<AnyClient>({
  serviceName: "academic",
  address: `${academicHost}:${academicPort}`,
  ClientConstructor: academicPkg.acadflow.academic.AcademicService,
  logger: createLogger("gateway→academic"),
});

export const notifications = createGrpcClient<AnyClient>({
  serviceName: "notifications",
  address: `${notificationsHost}:${notificationsPort}`,
  ClientConstructor: notificationsPkg.acadflow.notifications.NotificationService,
  logger: createLogger("gateway→notifications"),
});
