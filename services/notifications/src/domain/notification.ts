import type {
  Notification,
  NotificationKind,
} from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type { NotificationKind as DbKind } from "../generated/prisma/index.js";
import { enrichFromItem } from "../academic-client.js";
import { prisma } from "../db.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

function toDbKind(value: string | undefined): DbKind | undefined {
  if (!value || value === "NOTIFICATION_KIND_UNSPECIFIED") return undefined;
  return value as DbKind;
}

type DbNotification = {
  id: string;
  kind: DbKind;
  title: string;
  body: string;
  relatedItemId: string | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
};

export async function mapNotification(
  row: DbNotification,
  enrich = true,
): Promise<Notification> {
  let relatedItemTitle = "";
  let relatedSubjectName = "";
  if (enrich && row.relatedItemId) {
    const extra = await enrichFromItem(row.relatedItemId);
    relatedItemTitle = extra.relatedItemTitle;
    relatedSubjectName = extra.relatedSubjectName;
  }

  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    relatedItemId: row.relatedItemId ?? "",
    relatedItemTitle,
    relatedSubjectName,
    readAt: iso(row.readAt),
    dismissedAt: iso(row.dismissedAt),
    createdAt: iso(row.createdAt),
  };
}

export async function createNotification(input: {
  kind?: string;
  title?: string;
  body?: string;
  relatedItemId?: string;
}): Promise<Notification> {
  const dbKind = toDbKind(input.kind);
  if (!dbKind) throw invalidArgument("kind is required");
  if (!input.title?.trim()) throw invalidArgument("title is required");

  const row = await prisma.notification.create({
    data: {
      kind: dbKind,
      title: input.title.trim(),
      body: input.body ?? "",
      relatedItemId: input.relatedItemId || null,
    },
  });

  return mapNotification(row, true);
}

export async function listNotifications(input: {
  includeDismissed?: boolean;
  unreadOnly?: boolean;
  kind?: string;
}): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: {
      ...(input.includeDismissed ? {} : { dismissedAt: null }),
      ...(input.unreadOnly ? { readAt: null } : {}),
      ...(toDbKind(input.kind) ? { kind: toDbKind(input.kind) } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(rows.map((row) => mapNotification(row, true)));
}

export async function markRead(id: string): Promise<Notification> {
  try {
    const row = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return mapNotification(row, true);
  } catch {
    throw notFound("Notification not found");
  }
}

export async function dismiss(id: string): Promise<Notification> {
  try {
    const row = await prisma.notification.update({
      where: { id },
      data: { dismissedAt: new Date(), readAt: new Date() },
    });
    return mapNotification(row, false);
  } catch {
    throw notFound("Notification not found");
  }
}

export async function getNotification(id: string): Promise<Notification> {
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row) throw notFound("Notification not found");
  return mapNotification(row, true);
}

export async function deleteByRelatedItem(
  relatedItemId: string,
): Promise<number> {
  if (!relatedItemId?.trim()) {
    throw invalidArgument("relatedItemId is required");
  }
  const result = await prisma.notification.deleteMany({
    where: { relatedItemId },
  });
  return result.count;
}
