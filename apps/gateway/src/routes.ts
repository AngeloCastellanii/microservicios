import type { FastifyInstance } from "fastify";
import { academic, notifications } from "./clients.js";

function grpcHttpStatus(code: number | undefined): number {
  switch (code) {
    case 3: // INVALID_ARGUMENT
      return 400;
    case 5: // NOT_FOUND
      return 404;
    case 6: // ALREADY_EXISTS
      return 409;
    case 16: // UNAUTHENTICATED
      return 401;
    case 7: // PERMISSION_DENIED
      return 403;
    default:
      return 500;
  }
}

async function callOrReply<T>(
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  fn: () => Promise<T>,
) {
  try {
    return await fn();
  } catch (error) {
    const err = error as { code?: number; details?: string; message?: string };
    return reply.code(grpcHttpStatus(err.code)).send({
      error: err.details || err.message || "gRPC error",
    });
  }
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, service: "gateway" }));

  // Subjects
  app.get("/api/subjects", async (_req, reply) =>
    callOrReply(reply, () => academic.ListSubjects({})),
  );
  app.post<{ Body: Record<string, unknown> }>("/api/subjects", async (req, reply) =>
    callOrReply(reply, () => academic.CreateSubject(req.body)),
  );
  app.get<{ Params: { id: string } }>("/api/subjects/:id", async (req, reply) =>
    callOrReply(reply, () => academic.GetSubject({ id: req.params.id })),
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/api/subjects/:id",
    async (req, reply) =>
      callOrReply(reply, () =>
        academic.UpdateSubject({ id: req.params.id, ...req.body }),
      ),
  );
  app.delete<{ Params: { id: string } }>("/api/subjects/:id", async (req, reply) =>
    callOrReply(reply, () => academic.DeleteSubject({ id: req.params.id })),
  );

  // Items
  app.get<{ Querystring: Record<string, string> }>("/api/items", async (req, reply) =>
    callOrReply(reply, () =>
      academic.ListItems({
        subjectId: req.query.subjectId || "",
        type: req.query.type || "ITEM_TYPE_UNSPECIFIED",
        upcomingOnly: req.query.upcomingOnly === "true",
        limit: req.query.limit ? Number(req.query.limit) : 0,
      }),
    ),
  );
  app.post<{ Body: Record<string, unknown> }>("/api/items", async (req, reply) =>
    callOrReply(reply, () => academic.CreateItem(req.body)),
  );
  app.get<{ Params: { id: string } }>("/api/items/:id", async (req, reply) =>
    callOrReply(reply, () => academic.GetItem({ id: req.params.id })),
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/api/items/:id",
    async (req, reply) =>
      callOrReply(reply, () =>
        academic.UpdateItem({ id: req.params.id, ...req.body }),
      ),
  );
  app.delete<{ Params: { id: string } }>("/api/items/:id", async (req, reply) =>
    callOrReply(reply, () => academic.DeleteItem({ id: req.params.id })),
  );

  // Schedule
  app.get("/api/schedule", async (_req, reply) =>
    callOrReply(reply, () => academic.ListSchedule({})),
  );
  app.post<{ Body: Record<string, unknown> }>("/api/schedule", async (req, reply) =>
    callOrReply(reply, () => academic.UpsertScheduleSlot(req.body)),
  );
  app.delete<{ Params: { id: string } }>("/api/schedule/:id", async (req, reply) =>
    callOrReply(reply, () => academic.DeleteScheduleSlot({ id: req.params.id })),
  );

  // Notes
  app.get<{ Querystring: Record<string, string> }>("/api/notes", async (req, reply) =>
    callOrReply(reply, () =>
      academic.ListNotes({
        subjectId: req.query.subjectId || "",
        generalOnly: req.query.generalOnly === "true",
      }),
    ),
  );
  app.post<{ Body: Record<string, unknown> }>("/api/notes", async (req, reply) =>
    callOrReply(reply, () => academic.CreateNote(req.body)),
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/api/notes/:id",
    async (req, reply) =>
      callOrReply(reply, () =>
        academic.UpdateNote({ id: req.params.id, ...req.body }),
      ),
  );
  app.delete<{ Params: { id: string } }>("/api/notes/:id", async (req, reply) =>
    callOrReply(reply, () => academic.DeleteNote({ id: req.params.id })),
  );

  // Notifications
  app.get<{ Querystring: Record<string, string> }>(
    "/api/notifications",
    async (req, reply) =>
      callOrReply(reply, () =>
        notifications.ListNotifications({
          includeDismissed: req.query.includeDismissed === "true",
          unreadOnly: req.query.unreadOnly === "true",
          kind: req.query.kind || "NOTIFICATION_KIND_UNSPECIFIED",
        }),
      ),
  );
  app.post<{ Body: Record<string, unknown> }>(
    "/api/notifications",
    async (req, reply) =>
      callOrReply(reply, () => notifications.CreateNotification(req.body)),
  );
  app.post<{ Params: { id: string } }>(
    "/api/notifications/:id/read",
    async (req, reply) =>
      callOrReply(reply, () => notifications.MarkRead({ id: req.params.id })),
  );
  app.post<{ Params: { id: string } }>(
    "/api/notifications/:id/dismiss",
    async (req, reply) =>
      callOrReply(reply, () => notifications.Dismiss({ id: req.params.id })),
  );
}
