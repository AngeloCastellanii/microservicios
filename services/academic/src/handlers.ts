import type {
  CreateItemRequest,
  CreateNoteRequest,
  CreatePeriodRequest,
  CreateSubjectRequest,
  DeleteItemRequest,
  DeleteNoteRequest,
  DeletePeriodRequest,
  DeleteResponse,
  DeleteScheduleSlotRequest,
  DeleteSubjectRequest,
  GetItemRequest,
  GetSubjectRequest,
  Item,
  ListItemsRequest,
  ListItemsResponse,
  ListNotesRequest,
  ListNotesResponse,
  ListPeriodsRequest,
  ListPeriodsResponse,
  ListScheduleRequest,
  ListScheduleResponse,
  ListSubjectsRequest,
  ListSubjectsResponse,
  Note,
  Period,
  ScheduleSlot,
  SetActivePeriodRequest,
  Subject,
  UpdateItemRequest,
  UpdateNoteRequest,
  UpdateSubjectRequest,
  UpsertScheduleSlotRequest,
} from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type * as grpc from "@grpc/grpc-js";
import { prisma } from "./db.js";
import {
  mapItem,
  mapNote,
  mapPeriod,
  mapSlot,
  mapSubject,
  toDbItemStatus,
  toDbItemType,
  toDbPeriodKind,
} from "./mappers.js";
import { createPersistentReminder } from "./notifications-client.js";

type Call<T> = grpc.ServerUnaryCall<T, unknown>;

export const academicHandlers = {
  async CreatePeriod(call: Call<CreatePeriodRequest>): Promise<Period> {
    const { name, kind, year, setActive } = call.request;
    const dbKind = toDbPeriodKind(kind);
    if (!name?.trim()) throw invalidArgument("name is required");
    if (!dbKind) throw invalidArgument("kind must be TRIMESTER or SEMESTER");
    if (!year || year < 2000) throw invalidArgument("year is required");

    if (setActive) {
      await prisma.period.updateMany({ data: { isActive: false } });
    }

    const row = await prisma.period.create({
      data: {
        name: name.trim(),
        kind: dbKind,
        year,
        isActive: Boolean(setActive),
      },
    });
    return mapPeriod(row);
  },

  async ListPeriods(_call: Call<ListPeriodsRequest>): Promise<ListPeriodsResponse> {
    const rows = await prisma.period.findMany({
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
    return { periods: rows.map(mapPeriod) };
  },

  async SetActivePeriod(call: Call<SetActivePeriodRequest>): Promise<Period> {
    const existing = await prisma.period.findUnique({
      where: { id: call.request.id },
    });
    if (!existing) throw notFound("Period not found");

    await prisma.$transaction([
      prisma.period.updateMany({ data: { isActive: false } }),
      prisma.period.update({
        where: { id: call.request.id },
        data: { isActive: true },
      }),
    ]);

    const row = await prisma.period.findUniqueOrThrow({
      where: { id: call.request.id },
    });
    return mapPeriod(row);
  },

  async DeletePeriod(call: Call<DeletePeriodRequest>): Promise<DeleteResponse> {
    try {
      await prisma.period.delete({ where: { id: call.request.id } });
      return { ok: true };
    } catch {
      throw notFound("Period not found");
    }
  },

  async CreateSubject(call: Call<CreateSubjectRequest>): Promise<Subject> {
    const { periodId, name, description, color } = call.request;
    if (!periodId) throw invalidArgument("periodId is required");
    if (!name?.trim()) throw invalidArgument("name is required");

    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) throw notFound("Period not found");

    const row = await prisma.subject.create({
      data: {
        periodId,
        name: name.trim(),
        description: description ?? "",
        color: color || "#0C3B2E",
      },
    });
    return mapSubject(row);
  },

  async ListSubjects(call: Call<ListSubjectsRequest>): Promise<ListSubjectsResponse> {
    const { periodId } = call.request;
    const rows = await prisma.subject.findMany({
      where: periodId ? { periodId } : undefined,
      orderBy: { name: "asc" },
    });
    return { subjects: rows.map(mapSubject) };
  },

  async GetSubject(call: Call<GetSubjectRequest>): Promise<Subject> {
    const row = await prisma.subject.findUnique({ where: { id: call.request.id } });
    if (!row) throw notFound("Subject not found");
    return mapSubject(row);
  },

  async UpdateSubject(call: Call<UpdateSubjectRequest>): Promise<Subject> {
    const { id, name, description, color } = call.request;
    try {
      const row = await prisma.subject.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(color ? { color } : {}),
        },
      });
      return mapSubject(row);
    } catch {
      throw notFound("Subject not found");
    }
  },

  async DeleteSubject(call: Call<DeleteSubjectRequest>): Promise<DeleteResponse> {
    try {
      await prisma.subject.delete({ where: { id: call.request.id } });
      return { ok: true };
    } catch {
      throw notFound("Subject not found");
    }
  },

  async CreateItem(call: Call<CreateItemRequest>): Promise<Item> {
    const req = call.request;
    if (!req.subjectId || !req.title?.trim()) {
      throw invalidArgument("subjectId and title are required");
    }
    const type = toDbItemType(req.type);
    if (!type) throw invalidArgument("type is required");

    const subject = await prisma.subject.findUnique({
      where: { id: req.subjectId },
    });
    if (!subject) throw notFound("Subject not found");

    const row = await prisma.item.create({
      data: {
        subjectId: req.subjectId,
        title: req.title.trim(),
        description: req.description ?? "",
        type,
        status: toDbItemStatus(req.status) ?? "PENDING",
        dueAt: req.dueAt ? new Date(req.dueAt) : null,
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
  },

  async ListItems(call: Call<ListItemsRequest>): Promise<ListItemsResponse> {
    const { subjectId, periodId, type, upcomingOnly, limit } = call.request;
    const rows = await prisma.item.findMany({
      where: {
        ...(subjectId ? { subjectId } : {}),
        ...(periodId ? { subject: { periodId } } : {}),
        ...(toDbItemType(type) ? { type: toDbItemType(type) } : {}),
        ...(upcomingOnly
          ? { dueAt: { gte: new Date() }, status: { not: "DONE" } }
          : {}),
      },
      include: { subject: true },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: limit && limit > 0 ? limit : undefined,
    });
    return { items: rows.map(mapItem) };
  },

  async GetItem(call: Call<GetItemRequest>): Promise<Item> {
    const row = await prisma.item.findUnique({
      where: { id: call.request.id },
      include: { subject: true },
    });
    if (!row) throw notFound("Item not found");
    return mapItem(row);
  },

  async UpdateItem(call: Call<UpdateItemRequest>): Promise<Item> {
    const req = call.request;
    try {
      const row = await prisma.item.update({
        where: { id: req.id },
        data: {
          ...(req.title ? { title: req.title } : {}),
          ...(req.description !== undefined ? { description: req.description } : {}),
          ...(toDbItemType(req.type) ? { type: toDbItemType(req.type) } : {}),
          ...(toDbItemStatus(req.status)
            ? { status: toDbItemStatus(req.status) }
            : {}),
          ...(req.dueAt !== undefined
            ? { dueAt: req.dueAt ? new Date(req.dueAt) : null }
            : {}),
        },
        include: { subject: true },
      });
      return mapItem(row);
    } catch {
      throw notFound("Item not found");
    }
  },

  async DeleteItem(call: Call<DeleteItemRequest>): Promise<DeleteResponse> {
    try {
      await prisma.item.delete({ where: { id: call.request.id } });
      return { ok: true };
    } catch {
      throw notFound("Item not found");
    }
  },

  async UpsertScheduleSlot(
    call: Call<UpsertScheduleSlotRequest>,
  ): Promise<ScheduleSlot> {
    const req = call.request;
    if (!req.subjectId || req.dayOfWeek < 1 || req.dayOfWeek > 7) {
      throw invalidArgument("subjectId and dayOfWeek (1-7) are required");
    }
    if (!req.startTime || !req.endTime) {
      throw invalidArgument("startTime and endTime are required");
    }

    const subject = await prisma.subject.findUnique({
      where: { id: req.subjectId },
    });
    if (!subject) throw notFound("Subject not found");

    const data = {
      subjectId: req.subjectId,
      dayOfWeek: req.dayOfWeek,
      startTime: req.startTime,
      endTime: req.endTime,
      label: req.label ?? "",
    };

    const row = req.id
      ? await prisma.scheduleSlot.update({
          where: { id: req.id },
          data,
          include: { subject: true },
        })
      : await prisma.scheduleSlot.create({
          data,
          include: { subject: true },
        });

    return mapSlot(row);
  },

  async ListSchedule(
    call: Call<ListScheduleRequest>,
  ): Promise<ListScheduleResponse> {
    const { periodId } = call.request;
    const rows = await prisma.scheduleSlot.findMany({
      where: periodId ? { subject: { periodId } } : undefined,
      include: { subject: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return { slots: rows.map(mapSlot) };
  },

  async DeleteScheduleSlot(
    call: Call<DeleteScheduleSlotRequest>,
  ): Promise<DeleteResponse> {
    try {
      await prisma.scheduleSlot.delete({ where: { id: call.request.id } });
      return { ok: true };
    } catch {
      throw notFound("Schedule slot not found");
    }
  },

  async CreateNote(call: Call<CreateNoteRequest>): Promise<Note> {
    const { periodId, subjectId, title, body } = call.request;
    if (!title?.trim()) throw invalidArgument("title is required");

    let resolvedPeriodId = periodId || null;
    if (subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject) throw notFound("Subject not found");
      resolvedPeriodId = subject.periodId;
    }
    if (!resolvedPeriodId) throw invalidArgument("periodId is required");

    const row = await prisma.note.create({
      data: {
        periodId: resolvedPeriodId,
        subjectId: subjectId || null,
        title: title.trim(),
        body: body ?? "",
      },
      include: { subject: true },
    });
    return mapNote(row);
  },

  async ListNotes(call: Call<ListNotesRequest>): Promise<ListNotesResponse> {
    const { periodId, subjectId, generalOnly } = call.request;
    const rows = await prisma.note.findMany({
      where: {
        ...(periodId ? { periodId } : {}),
        ...(generalOnly
          ? { subjectId: null }
          : subjectId
            ? { subjectId }
            : {}),
      },
      include: { subject: true },
      orderBy: { updatedAt: "desc" },
    });
    return { notes: rows.map(mapNote) };
  },

  async UpdateNote(call: Call<UpdateNoteRequest>): Promise<Note> {
    const req = call.request;
    try {
      const row = await prisma.note.update({
        where: { id: req.id },
        data: {
          ...(req.title ? { title: req.title } : {}),
          ...(req.body !== undefined ? { body: req.body } : {}),
          ...(req.subjectId !== undefined
            ? { subjectId: req.subjectId || null }
            : {}),
        },
        include: { subject: true },
      });
      return mapNote(row);
    } catch {
      throw notFound("Note not found");
    }
  },

  async DeleteNote(call: Call<DeleteNoteRequest>): Promise<DeleteResponse> {
    try {
      await prisma.note.delete({ where: { id: call.request.id } });
      return { ok: true };
    } catch {
      throw notFound("Note not found");
    }
  },
};
