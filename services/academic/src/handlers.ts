import type {
  CreateItemRequest,
  CreateNoteRequest,
  CreateSubjectRequest,
  DeleteItemRequest,
  DeleteNoteRequest,
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
  ListScheduleRequest,
  ListScheduleResponse,
  ListSubjectsRequest,
  ListSubjectsResponse,
  Note,
  ScheduleSlot,
  Subject,
  UpdateItemRequest,
  UpdateNoteRequest,
  UpdateSubjectRequest,
  UpsertScheduleSlotRequest,
} from "@acadflow/proto";
import { invalidArgument, notFound } from "@acadflow/rpc-wrapper";
import type * as grpc from "@grpc/grpc-js";
import { prisma } from "./db.js";
import {
  mapItem,
  mapNote,
  mapSlot,
  mapSubject,
  toDbItemStatus,
  toDbItemType,
} from "./mappers.js";
import { createPersistentReminder } from "./notifications-client.js";

type Call<T> = grpc.ServerUnaryCall<T, unknown>;

export const academicHandlers = {
  async CreateSubject(call: Call<CreateSubjectRequest>): Promise<Subject> {
    const { name, description, color } = call.request;
    if (!name?.trim()) throw invalidArgument("name is required");
    const row = await prisma.subject.create({
      data: {
        name: name.trim(),
        description: description ?? "",
        color: color || "#0F766E",
      },
    });
    return mapSubject(row);
  },

  async ListSubjects(_call: Call<ListSubjectsRequest>): Promise<ListSubjectsResponse> {
    const rows = await prisma.subject.findMany({ orderBy: { name: "asc" } });
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
    const { subjectId, type, upcomingOnly, limit } = call.request;
    const rows = await prisma.item.findMany({
      where: {
        ...(subjectId ? { subjectId } : {}),
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
    _call: Call<ListScheduleRequest>,
  ): Promise<ListScheduleResponse> {
    const rows = await prisma.scheduleSlot.findMany({
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
    const { subjectId, title, body } = call.request;
    if (!title?.trim()) throw invalidArgument("title is required");
    if (subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject) throw notFound("Subject not found");
    }
    const row = await prisma.note.create({
      data: {
        subjectId: subjectId || null,
        title: title.trim(),
        body: body ?? "",
      },
      include: { subject: true },
    });
    return mapNote(row);
  },

  async ListNotes(call: Call<ListNotesRequest>): Promise<ListNotesResponse> {
    const { subjectId, generalOnly } = call.request;
    const rows = await prisma.note.findMany({
      where: generalOnly
        ? { subjectId: null }
        : subjectId
          ? { subjectId }
          : undefined,
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
