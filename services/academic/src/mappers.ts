import type {
  Item,
  ItemStatus,
  ItemType,
  Note,
  ScheduleSlot,
  Subject,
} from "@acadflow/proto";
import type {
  Item as DbItem,
  ItemStatus as DbItemStatus,
  ItemType as DbItemType,
  Note as DbNote,
  ScheduleSlot as DbSlot,
  Subject as DbSubject,
} from "./generated/prisma/index.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

export function mapSubject(row: DbSubject): Subject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
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

export function mapSlot(
  row: DbSlot & { subject?: { name: string } | null },
): ScheduleSlot {
  return {
    id: row.id,
    subjectId: row.subjectId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    label: row.label,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    subjectName: row.subject?.name ?? "",
  };
}

export function mapNote(
  row: DbNote & { subject?: { name: string } | null },
): Note {
  return {
    id: row.id,
    subjectId: row.subjectId ?? "",
    title: row.title,
    body: row.body,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    subjectName: row.subject?.name ?? "",
  };
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
