/** Puertos gRPC por defecto del monorepo. */
export const DEFAULT_PORTS = {
  academicGrpc: 50051,
  notificationsGrpc: 50052,
  gateway: 3010,
} as const;

export type ServiceName = "academic" | "notifications" | "gateway";

export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
