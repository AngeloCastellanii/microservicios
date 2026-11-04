import type { Note } from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type { Note as DbNote } from "../generated/prisma/index.js";
import { prisma } from "../db.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

export function mapNote(
  row: DbNote & { subject?: { name: string } | null },
): Note {
  return {
    id: row.id,
    periodId: row.periodId ?? "",
    subjectId: row.subjectId ?? "",
    title: row.title,
    body: row.body,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    subjectName: row.subject?.name ?? "",
  };
}

export async function createNote(input: {
  periodId?: string;
  subjectId?: string;
  title?: string;
  body?: string;
}): Promise<Note> {
  if (!input.title?.trim()) throw invalidArgument("title is required");

  let resolvedPeriodId = input.periodId || null;
  if (input.subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: input.subjectId },
    });
    if (!subject) throw notFound("Subject not found");
    resolvedPeriodId = subject.periodId;
  }
  if (!resolvedPeriodId) throw invalidArgument("periodId is required");

  const row = await prisma.note.create({
    data: {
      periodId: resolvedPeriodId,
      subjectId: input.subjectId || null,
      title: input.title.trim(),
      body: input.body ?? "",
    },
    include: { subject: true },
  });
  return mapNote(row);
}

export async function listNotes(input: {
  periodId?: string;
  subjectId?: string;
  generalOnly?: boolean;
}): Promise<Note[]> {
  const rows = await prisma.note.findMany({
    where: {
      ...(input.periodId ? { periodId: input.periodId } : {}),
      ...(input.generalOnly
        ? { subjectId: null }
        : input.subjectId
          ? { subjectId: input.subjectId }
          : {}),
    },
    include: { subject: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapNote);
}

export async function updateNote(input: {
  id: string;
  title?: string;
  body?: string;
  subjectId?: string;
}): Promise<Note> {
  try {
    const row = await prisma.note.update({
      where: { id: input.id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.subjectId !== undefined
          ? { subjectId: input.subjectId || null }
          : {}),
      },
      include: { subject: true },
    });
    return mapNote(row);
  } catch {
    throw notFound("Note not found");
  }
}

export async function deleteNote(id: string): Promise<void> {
  try {
    await prisma.note.delete({ where: { id } });
  } catch {
    throw notFound("Note not found");
  }
}
