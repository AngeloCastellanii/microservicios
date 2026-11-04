import type { Subject } from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type { Subject as DbSubject } from "../generated/prisma/index.js";
import { prisma } from "../db.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

export function mapSubject(row: DbSubject): Subject {
  return {
    id: row.id,
    periodId: row.periodId,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function createSubject(input: {
  periodId?: string;
  name?: string;
  description?: string;
  color?: string;
}): Promise<Subject> {
  if (!input.periodId) throw invalidArgument("periodId is required");
  if (!input.name?.trim()) throw invalidArgument("name is required");

  const period = await prisma.period.findUnique({
    where: { id: input.periodId },
  });
  if (!period) throw notFound("Period not found");

  const row = await prisma.subject.create({
    data: {
      periodId: input.periodId,
      name: input.name.trim(),
      description: input.description ?? "",
      color: input.color || "#0D9488",
    },
  });
  return mapSubject(row);
}

export async function listSubjects(periodId?: string): Promise<Subject[]> {
  const rows = await prisma.subject.findMany({
    where: periodId ? { periodId } : undefined,
    orderBy: { name: "asc" },
  });
  return rows.map(mapSubject);
}

export async function getSubject(id: string): Promise<Subject> {
  const row = await prisma.subject.findUnique({ where: { id } });
  if (!row) throw notFound("Subject not found");
  return mapSubject(row);
}

export async function updateSubject(input: {
  id: string;
  name?: string;
  description?: string;
  color?: string;
}): Promise<Subject> {
  try {
    const row = await prisma.subject.update({
      where: { id: input.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.color ? { color: input.color } : {}),
      },
    });
    return mapSubject(row);
  } catch {
    throw notFound("Subject not found");
  }
}

export async function deleteSubject(id: string): Promise<void> {
  try {
    await prisma.subject.delete({ where: { id } });
  } catch {
    throw notFound("Subject not found");
  }
}
