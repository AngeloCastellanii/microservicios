import * as grpc from "@grpc/grpc-js";

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code: grpc.status = grpc.status.INTERNAL,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

export function toServiceError(error: unknown): grpc.ServiceError {
  if (error && typeof error === "object" && "code" in error && "details" in error) {
    return error as grpc.ServiceError;
  }

  if (error instanceof RpcError) {
    return Object.assign(new Error(error.message), {
      code: error.code,
      details: error.message,
      metadata: new grpc.Metadata(),
    }) as grpc.ServiceError;
  }

  const message = error instanceof Error ? error.message : "Internal error";
  return Object.assign(new Error(message), {
    code: grpc.status.INTERNAL,
    details: message,
    metadata: new grpc.Metadata(),
  }) as grpc.ServiceError;
}

export function notFound(message: string): RpcError {
  return new RpcError(message, grpc.status.NOT_FOUND);
}

export function invalidArgument(message: string): RpcError {
  return new RpcError(message, grpc.status.INVALID_ARGUMENT);
}
