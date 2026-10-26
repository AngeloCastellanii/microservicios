import { loadAcademicPackage } from "@acadflow/proto";
import { createGrpcClient, createLogger } from "@acadflow/rpc-wrapper";
import { DEFAULT_PORTS, envInt } from "@acadflow/shared";
import type * as grpc from "@grpc/grpc-js";

const logger = createLogger("notifications→academic");

type AcademicClient = grpc.Client & {
  GetItem: unknown;
};

let client: ReturnType<typeof createGrpcClient<AcademicClient>> | null = null;

export function getAcademicClient() {
  if (client) return client;

  const pkg = loadAcademicPackage() as unknown as {
    acadflow: {
      academic: {
        AcademicService: new (
          address: string,
          credentials: grpc.ChannelCredentials,
        ) => AcademicClient;
      };
    };
  };

  const port = envInt("ACADEMIC_GRPC_PORT", DEFAULT_PORTS.academicGrpc);
  const host = process.env.ACADEMIC_GRPC_HOST ?? "127.0.0.1";

  client = createGrpcClient<AcademicClient>({
    serviceName: "academic",
    address: `${host}:${port}`,
    ClientConstructor: pkg.acadflow.academic.AcademicService,
    logger,
  });

  return client;
}

export async function enrichFromItem(relatedItemId: string): Promise<{
  relatedItemTitle: string;
  relatedSubjectName: string;
}> {
  try {
    const c = getAcademicClient() as {
      GetItem: (req: { id: string }) => Promise<{
        title: string;
        subjectName: string;
      }>;
    };
    const item = await c.GetItem({ id: relatedItemId });
    return {
      relatedItemTitle: item.title ?? "",
      relatedSubjectName: item.subjectName ?? "",
    };
  } catch (error) {
    logger.warn("No se pudo enriquecer con academic", error);
    return { relatedItemTitle: "", relatedSubjectName: "" };
  }
}
