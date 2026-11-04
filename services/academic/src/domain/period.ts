import type { Period, PeriodKind } from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type {
  Period as DbPeriod,
  PeriodKind as DbPeriodKind,
} from "../generated/prisma/index.js";
import { prisma } from "../db.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

export function toDbPeriodKind(
  value: string | undefined,
): DbPeriodKind | undefined {
  if (!value || value === "PERIOD_KIND_UNSPECIFIED") return undefined;
  if (value === "TRIMESTER" || value === "SEMESTER" || value === "CUSTOM") {
    return value;
  }
  return undefined;
}

export function mapPeriod(row: DbPeriod): Period {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as PeriodKind,
    year: row.year,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
  };
}

function parseDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw invalidArgument("fecha inválida");
  return date;
}

export async function createPeriod(input: {
  name?: string;
  kind?: string;
  year?: number;
  setActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}): Promise<Period> {
  const dbKind = toDbPeriodKind(input.kind);
  if (!input.name?.trim()) throw invalidArgument("name is required");
  if (!dbKind) {
    throw invalidArgument("kind must be TRIMESTER, SEMESTER or CUSTOM");
  }
  if (!input.year || input.year < 2000) throw invalidArgument("year is required");

  const startsAt = parseDate(input.startsAt);
  const endsAt = parseDate(input.endsAt);
  if (startsAt && endsAt && endsAt < startsAt) {
    throw invalidArgument("la fecha de fin debe ser posterior al inicio");
  }

  if (input.setActive) {
    await prisma.period.updateMany({ data: { isActive: false } });
  }

  const row = await prisma.period.create({
    data: {
      name: input.name.trim(),
      kind: dbKind,
        year: input.year,
        isActive: Boolean(input.setActive),
        startsAt: startsAt ?? null,
        endsAt: endsAt ?? null,
      },
    });
  return mapPeriod(row);
}

export async function updatePeriod(input: {
  id: string;
  startsAt?: string;
  endsAt?: string;
}): Promise<Period> {
  const existing = await prisma.period.findUnique({ where: { id: input.id } });
  if (!existing) throw notFound("Period not found");

  const startsAt =
    input.startsAt !== undefined ? parseDate(input.startsAt) : existing.startsAt;
  const endsAt =
    input.endsAt !== undefined ? parseDate(input.endsAt) : existing.endsAt;
  if (startsAt && endsAt && endsAt < startsAt) {
    throw invalidArgument("la fecha de fin debe ser posterior al inicio");
  }

  const row = await prisma.period.update({
    where: { id: input.id },
    data: {
      ...(input.startsAt !== undefined ? { startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt } : {}),
    },
  });
  return mapPeriod(row);
}

export async function listPeriods(): Promise<Period[]> {
  const rows = await prisma.period.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapPeriod);
}

export async function setActivePeriod(id: string): Promise<Period> {
  const existing = await prisma.period.findUnique({ where: { id } });
  if (!existing) throw notFound("Period not found");

  await prisma.$transaction([
    prisma.period.updateMany({ data: { isActive: false } }),
    prisma.period.update({ where: { id }, data: { isActive: true } }),
  ]);

  const row = await prisma.period.findUniqueOrThrow({ where: { id } });
  return mapPeriod(row);
}

export async function deletePeriod(id: string): Promise<void> {
  try {
    await prisma.period.delete({ where: { id } });
  } catch {
    throw notFound("Period not found");
  }
}
