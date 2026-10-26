import type {
  CreateNotificationRequest,
  DismissRequest,
  GetNotificationRequest,
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkReadRequest,
  Notification,
  NotificationKind,
} from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type { NotificationKind as DbKind } from "./generated/prisma/index.js";
import type * as grpc from "@grpc/grpc-js";
import { enrichFromItem } from "./academic-client.js";
import { prisma } from "./db.js";

type Call<T> = grpc.ServerUnaryCall<T, unknown>;

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

function toDbKind(value: string | undefined): DbKind | undefined {
  if (!value || value === "NOTIFICATION_KIND_UNSPECIFIED") return undefined;
  return value as DbKind;
}

async function mapNotification(
  row: {
    id: string;
    kind: DbKind;
    title: string;
    body: string;
    relatedItemId: string | null;
    readAt: Date | null;
    dismissedAt: Date | null;
    createdAt: Date;
  },
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

export const notificationHandlers = {
  async CreateNotification(
    call: Call<CreateNotificationRequest>,
  ): Promise<Notification> {
    const { kind, title, body, relatedItemId } = call.request;
    const dbKind = toDbKind(kind);
    if (!dbKind) throw invalidArgument("kind is required");
    if (!title?.trim()) throw invalidArgument("title is required");

    const row = await prisma.notification.create({
      data: {
        kind: dbKind,
        title: title.trim(),
        body: body ?? "",
        relatedItemId: relatedItemId || null,
      },
    });

    return mapNotification(row, true);
  },

  async ListNotifications(
    call: Call<ListNotificationsRequest>,
  ): Promise<ListNotificationsResponse> {
    const { includeDismissed, unreadOnly, kind } = call.request;
    const rows = await prisma.notification.findMany({
      where: {
        ...(includeDismissed ? {} : { dismissedAt: null }),
        ...(unreadOnly ? { readAt: null } : {}),
        ...(toDbKind(kind) ? { kind: toDbKind(kind) } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const notifications = await Promise.all(
      rows.map((row) => mapNotification(row, true)),
    );
    return { notifications };
  },

  async MarkRead(call: Call<MarkReadRequest>): Promise<Notification> {
    try {
      const row = await prisma.notification.update({
        where: { id: call.request.id },
        data: { readAt: new Date() },
      });
      return mapNotification(row, true);
    } catch {
      throw notFound("Notification not found");
    }
  },

  async Dismiss(call: Call<DismissRequest>): Promise<Notification> {
    try {
      const row = await prisma.notification.update({
        where: { id: call.request.id },
        data: { dismissedAt: new Date(), readAt: new Date() },
      });
      return mapNotification(row, false);
    } catch {
      throw notFound("Notification not found");
    }
  },

  async GetNotification(
    call: Call<GetNotificationRequest>,
  ): Promise<Notification> {
    const row = await prisma.notification.findUnique({
      where: { id: call.request.id },
    });
    if (!row) throw notFound("Notification not found");
    return mapNotification(row, true);
  },
};
