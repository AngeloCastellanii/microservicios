import * as grpc from "@grpc/grpc-js";
import { createLogger, type Logger } from "./log.js";

export interface CreateGrpcClientOptions {
  serviceName: string;
  address: string;
  /** Constructor del cliente generado por loadPackageDefinition */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ClientConstructor: new (
    address: string,
    credentials: grpc.ChannelCredentials,
    options?: object,
  ) => grpc.Client;
  logger?: Logger;
  deadlineMs?: number;
}

export type PromisifiedClient<T> = {
  [K in keyof T]: T[K] extends (
    request: infer Req,
    callback: (error: grpc.ServiceError | null, response: infer Res) => void,
  ) => grpc.ClientUnaryCall
    ? (request: Req) => Promise<Res>
    : T[K] extends (
          request: infer Req,
          metadata: grpc.Metadata,
          callback: (error: grpc.ServiceError | null, response: infer Res) => void,
        ) => grpc.ClientUnaryCall
      ? (request: Req) => Promise<Res>
      : T[K];
};

function promisifyUnary<TReq, TRes>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  methodName: string,
  deadlineMs: number,
  logger: Logger,
): (request: TReq) => Promise<TRes> {
  return (request: TReq) =>
    new Promise<TRes>((resolve, reject) => {
      const started = Date.now();
      const deadline = new Date(Date.now() + deadlineMs);
      client[methodName](
        request,
        new grpc.Metadata(),
        { deadline },
        (error: grpc.ServiceError | null, response: TRes) => {
          if (error) {
            logger.error(`${methodName} client error`, {
              code: error.code,
              details: error.details,
            });
            reject(error);
            return;
          }
          logger.info(`${methodName} client ok`, { ms: Date.now() - started });
          resolve(response);
        },
      );
    });
}

export function createGrpcClient<TClient extends grpc.Client>(
  options: CreateGrpcClientOptions,
): PromisifiedClient<TClient> & { close: () => void; raw: TClient } {
  const logger = options.logger ?? createLogger(`${options.serviceName}-client`);
  const deadlineMs = options.deadlineMs ?? 10_000;
  const raw = new options.ClientConstructor(
    options.address,
    grpc.credentials.createInsecure(),
  ) as TClient;

  const proxy = new Proxy(raw as object, {
    get(target, prop, receiver) {
      if (prop === "close") {
        return () => {
          raw.close();
          logger.info("client closed");
        };
      }
      if (prop === "raw") return raw;

      const value = Reflect.get(target, prop, receiver);
      if (typeof prop === "string" && typeof value === "function") {
        // Métodos de Channel/Client que no son RPC
        if (
          [
            "close",
            "getChannel",
            "waitForReady",
            "makeUnaryRequest",
            "makeClientStreamRequest",
            "makeServerStreamRequest",
            "makeBidiStreamRequest",
          ].includes(prop)
        ) {
          return value.bind(target);
        }
        return promisifyUnary(raw, prop, deadlineMs, logger);
      }
      return value;
    },
  }) as PromisifiedClient<TClient> & { close: () => void; raw: TClient };

  return proxy;
}

export async function waitForReady(
  client: grpc.Client,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = new Date(Date.now() + timeoutMs);
  await new Promise<void>((resolve, reject) => {
    client.waitForReady(deadline, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
