import type { Note, NoteImage } from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type {
  Note as DbNote,
  NoteImage as DbImage,
} from "../generated/prisma/index.js";
import { prisma } from "../db.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

type NoteRow = DbNote & {
  subject?: { name: string } | null;
  item?: { title: string; subjectId: string } | null;
  images?: DbImage[];
};

const noteInclude = {
  subject: true,
  item: true,
  images: { orderBy: { createdAt: "asc" as const } },
};

export function mapNote(row: NoteRow, withData = false): Note {
  return {
    id: row.id,
    periodId: row.periodId ?? "",
    subjectId: row.subjectId ?? "",
    title: row.title,
    body: row.body,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    subjectName: row.subject?.name ?? "",
    itemId: row.itemId ?? "",
    itemTitle: row.item?.title ?? "",
    images: (row.images ?? []).map((image) => ({
      id: image.id,
      noteId: image.noteId,
      mime: image.mime,
      data: withData ? image.data : "",
    })),
  };
}

async function resolveLinks(input: {
  periodId?: string;
  subjectId?: string;
  itemId?: string;
}) {
  let periodId = input.periodId || null;
  let subjectId = input.subjectId || null;
  let itemId = input.itemId || null;

  if (itemId) {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw notFound("Item not found");
    subjectId = item.subjectId;
    const subject = await prisma.subject.findUnique({
      where: { id: item.subjectId },
    });
    periodId = subject?.periodId ?? periodId;
  } else if (subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw notFound("Subject not found");
    periodId = subject.periodId;
  }

  if (!periodId) throw invalidArgument("periodId is required");
  return { periodId, subjectId, itemId };
}

export async function createNote(input: {
  periodId?: string;
  subjectId?: string;
  itemId?: string;
  title?: string;
  body?: string;
}): Promise<Note> {
  if (!input.title?.trim()) throw invalidArgument("title is required");
  const links = await resolveLinks(input);
  const row = await prisma.note.create({
    data: {
      ...links,
      title: input.title.trim(),
      body: input.body ?? "",
    },
    include: noteInclude,
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
    include: noteInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => mapNote(row));
}

export async function updateNote(input: {
  id: string;
  title?: string;
  body?: string;
  subjectId?: string;
  itemId?: string;
}): Promise<Note> {
  const existing = await prisma.note.findUnique({ where: { id: input.id } });
  if (!existing) throw notFound("Note not found");

  const links =
    input.subjectId !== undefined || input.itemId !== undefined
      ? await resolveLinks({
          periodId: existing.periodId ?? undefined,
          subjectId:
            input.subjectId !== undefined
              ? input.subjectId
              : (existing.subjectId ?? ""),
          itemId:
            input.itemId !== undefined ? input.itemId : (existing.itemId ?? ""),
        })
      : null;

  const row = await prisma.note.update({
    where: { id: input.id },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(links ?? {}),
    },
    include: noteInclude,
  });
  return mapNote(row);
}

export async function deleteNote(id: string): Promise<void> {
  try {
    await prisma.note.delete({ where: { id } });
  } catch {
    throw notFound("Note not found");
  }
}

export async function addNoteImage(input: {
  noteId?: string;
  mime?: string;
  data?: string;
}): Promise<NoteImage> {
  if (!input.noteId) throw invalidArgument("noteId is required");
  if (!input.data?.trim()) throw invalidArgument("data is required");
  const note = await prisma.note.findUnique({ where: { id: input.noteId } });
  if (!note) throw notFound("Note not found");
  const row = await prisma.noteImage.create({
    data: {
      noteId: input.noteId,
      mime: input.mime || "image/jpeg",
      data: input.data,
    },
  });
  return {
    id: row.id,
    noteId: row.noteId,
    mime: row.mime,
    data: "",
  };
}

export async function getNoteImage(id: string): Promise<NoteImage> {
  const row = await prisma.noteImage.findUnique({ where: { id } });
  if (!row) throw notFound("Image not found");
  return {
    id: row.id,
    noteId: row.noteId,
    mime: row.mime,
    data: row.data,
  };
}

export async function deleteNoteImage(id: string): Promise<void> {
  try {
    await prisma.noteImage.delete({ where: { id } });
  } catch {
    throw notFound("Image not found");
  }
}
