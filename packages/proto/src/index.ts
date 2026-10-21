import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Rutas absolutas a los .proto (útil para el wrapper y los servicios). */
export const PROTO_DIR = path.resolve(__dirname, "../proto");
export const ACADEMIC_PROTO = path.join(PROTO_DIR, "academic.proto");
export const NOTIFICATIONS_PROTO = path.join(PROTO_DIR, "notifications.proto");

export const protoLoaderOptions: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

export function loadPackageDefinition(protoPath: string): grpc.GrpcObject {
  const packageDefinition = protoLoader.loadSync(protoPath, protoLoaderOptions);
  return grpc.loadPackageDefinition(packageDefinition);
}

export function loadAcademicPackage(): grpc.GrpcObject {
  return loadPackageDefinition(ACADEMIC_PROTO);
}

export function loadNotificationsPackage(): grpc.GrpcObject {
  return loadPackageDefinition(NOTIFICATIONS_PROTO);
}

export type * from "./types.js";
