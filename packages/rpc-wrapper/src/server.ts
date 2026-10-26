import * as grpc from "@grpc/grpc-js";
import { createLogger, type Logger } from "./log.js";
import { toServiceError } from "./errors.js";

export type UnaryHandler<TReq, TRes> = (
  call: grpc.ServerUnaryCall<TReq, TRes>,
) => Promise<TRes>;

export type ServiceImplementation = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  UnaryHandler<any, any> | grpc.handleUnaryCall<any, any>
>;

export interface CreateGrpcServerOptions {
  serviceName: string;
  port: number;
  /** Definición del servicio gRPC (package definition cargado desde .proto). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceDefinition: grpc.ServiceDefinition<any> | object;
  implementation: ServiceImplementation;
  host?: string;
  logger?: Logger;
}

function wrapUnary<TReq, TRes>(
  handler: UnaryHandler<TReq, TRes>,
  logger: Logger,
  methodName: string,
): grpc.handleUnaryCall<TReq, TRes> {
  return (call, callback) => {
    const started = Date.now();
    handler(call)
      .then((response) => {
        logger.info(`${methodName} ok`, { ms: Date.now() - started });
        callback(null, response);
      })
      .catch((error: unknown) => {
        const serviceError = toServiceError(error);
        logger.error(`${methodName} failed`, {
          code: serviceError.code,
          details: serviceError.details,
        });
        callback(serviceError, null);
      });
  };
}

export interface GrpcServerHandle {
  server: grpc.Server;
  address: string;
  stop: () => Promise<void>;
}

export async function createGrpcServer(
  options: CreateGrpcServerOptions,
): Promise<GrpcServerHandle> {
  const logger = options.logger ?? createLogger(options.serviceName);
  const host = options.host ?? "0.0.0.0";
  const address = `${host}:${options.port}`;
  const server = new grpc.Server();

  const wrapped: grpc.UntypedServiceImplementation = {};
  for (const [methodName, handler] of Object.entries(options.implementation)) {
    if (typeof handler !== "function") continue;
    wrapped[methodName] = wrapUnary(
      handler as UnaryHandler<unknown, unknown>,
      logger,
      methodName,
    );
  }

  server.addService(
    options.serviceDefinition as grpc.ServiceDefinition,
    wrapped,
  );

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      address,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          reject(error);
          return;
        }
        logger.info(`gRPC listening on ${host}:${boundPort}`);
        resolve();
      },
    );
  });

  return {
    server,
    address,
    stop: () =>
      new Promise((resolve) => {
        server.tryShutdown(() => {
          logger.info("gRPC server stopped");
          resolve();
        });
      }),
  };
}
