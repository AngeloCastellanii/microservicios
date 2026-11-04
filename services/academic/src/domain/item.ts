import type { Item, ItemStatus, ItemType } from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type {
  Item as DbItem,
  ItemStatus as DbItemStatus,
  ItemType as DbItemType,
} from "../generated/prisma/index.js";
import { prisma } from "../db.js";
import {
  createPersistentReminder,
  deleteRemindersForItem,
} from "../notifications-client.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

export function toDbItemType(value: string | undefined): DbItemType | undefined {
  if (!value || value === "ITEM_TYPE_UNSPECIFIED") return undefined;
  return value as DbItemType;
}

export function toDbItemStatus(
  value: string | undefined,
): DbItemStatus | undefined {
  if (!value || value === "ITEM_STATUS_UNSPECIFIED") return undefined;
  return value as DbItemStatus;
}

export function mapItem(
  row: DbItem & { subject?: { name: string } | null },
): Item {
  return {
    id: row.id,
    subjectId: row.subjectId,
    title: row.title,
    description: row.description,
    type: row.type as ItemType,
    status: row.status as ItemStatus,
    dueAt: iso(row.dueAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    subjectName: row.subject?.name ?? "",
  };
}

export async function createItem(input: {
  subjectId?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  dueAt?: string;
}): Promise<Item> {
  if (!input.subjectId || !input.title?.trim()) {
    throw invalidArgument("subjectId and title are required");
  }
  const type = toDbItemType(input.type);
  if (!type) throw invalidArgument("type is required");

  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
  });
  if (!subject) throw notFound("Subject not found");

  const row = await prisma.item.create({
    data: {
      subjectId: input.subjectId,
      title: input.title.trim(),
      description: input.description ?? "",
      type,
      status: toDbItemStatus(input.status) ?? "PENDING",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
    include: { subject: true },
  });

  if (row.dueAt) {
    await createPersistentReminder({
      title: `Recordatorio: ${row.title}`,
      body: `${subject.name} · vence ${row.dueAt.toLocaleString("es")}`,
      relatedItemId: row.id,
    });
  }

  return mapItem(row);
}

export async function listItems(input: {
  subjectId?: string;
  periodId?: string;
  type?: string;
  upcomingOnly?: boolean;
  limit?: number;
}): Promise<Item[]> {
  const rows = await prisma.item.findMany({
    where: {
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(input.periodId ? { subject: { periodId: input.periodId } } : {}),
      ...(toDbItemType(input.type) ? { type: toDbItemType(input.type) } : {}),
      ...(input.upcomingOnly
        ? { dueAt: { gte: new Date() }, status: { not: "DONE" } }
        : {}),
    },
    include: { subject: true },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: input.limit && input.limit > 0 ? input.limit : undefined,
  });
  return rows.map(mapItem);
}

export async function getItem(id: string): Promise<Item> {
  const row = await prisma.item.findUnique({
    where: { id },
    include: { subject: true },
  });
  if (!row) throw notFound("Item not found");
  return mapItem(row);
}

export async function updateItem(input: {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  dueAt?: string;
}): Promise<Item> {
  try {
    const row = await prisma.item.update({
      where: { id: input.id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(toDbItemType(input.type) ? { type: toDbItemType(input.type) } : {}),
        ...(toDbItemStatus(input.status)
          ? { status: toDbItemStatus(input.status) }
          : {}),
        ...(input.dueAt !== undefined
          ? { dueAt: input.dueAt ? new Date(input.dueAt) : null }
          : {}),
      },
      include: { subject: true },
    });
    return mapItem(row);
  } catch {
    throw notFound("Item not found");
  }
}

export async function deleteItem(id: string): Promise<void> {
  try {
    await prisma.item.delete({ where: { id } });
    await deleteRemindersForItem(id);
  } catch {
    throw notFound("Item not found");
  }
}
