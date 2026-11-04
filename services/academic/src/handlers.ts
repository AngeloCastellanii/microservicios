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
import type * as grpc from "@grpc/grpc-js";
import * as domain from "./domain/index.js";

type Call<T> = grpc.ServerUnaryCall<T, unknown>;

export const academicHandlers = {
  async CreatePeriod(call: Call<CreatePeriodRequest>): Promise<Period> {
    return domain.createPeriod(call.request);
  },

  async ListPeriods(
    _call: Call<ListPeriodsRequest>,
  ): Promise<ListPeriodsResponse> {
    return { periods: await domain.listPeriods() };
  },

  async SetActivePeriod(call: Call<SetActivePeriodRequest>): Promise<Period> {
    return domain.setActivePeriod(call.request.id);
  },

  async DeletePeriod(call: Call<DeletePeriodRequest>): Promise<DeleteResponse> {
    await domain.deletePeriod(call.request.id);
    return { ok: true };
  },

  async CreateSubject(call: Call<CreateSubjectRequest>): Promise<Subject> {
    return domain.createSubject(call.request);
  },

  async ListSubjects(
    call: Call<ListSubjectsRequest>,
  ): Promise<ListSubjectsResponse> {
    return { subjects: await domain.listSubjects(call.request.periodId) };
  },

  async GetSubject(call: Call<GetSubjectRequest>): Promise<Subject> {
    return domain.getSubject(call.request.id);
  },

  async UpdateSubject(call: Call<UpdateSubjectRequest>): Promise<Subject> {
    return domain.updateSubject(call.request);
  },

  async DeleteSubject(
    call: Call<DeleteSubjectRequest>,
  ): Promise<DeleteResponse> {
    await domain.deleteSubject(call.request.id);
    return { ok: true };
  },

  async CreateItem(call: Call<CreateItemRequest>): Promise<Item> {
    return domain.createItem(call.request);
  },

  async ListItems(call: Call<ListItemsRequest>): Promise<ListItemsResponse> {
    return { items: await domain.listItems(call.request) };
  },

  async GetItem(call: Call<GetItemRequest>): Promise<Item> {
    return domain.getItem(call.request.id);
  },

  async UpdateItem(call: Call<UpdateItemRequest>): Promise<Item> {
    return domain.updateItem(call.request);
  },

  async DeleteItem(call: Call<DeleteItemRequest>): Promise<DeleteResponse> {
    await domain.deleteItem(call.request.id);
    return { ok: true };
  },

  async UpsertScheduleSlot(
    call: Call<UpsertScheduleSlotRequest>,
  ): Promise<ScheduleSlot> {
    return domain.upsertScheduleSlot(call.request);
  },

  async ListSchedule(
    call: Call<ListScheduleRequest>,
  ): Promise<ListScheduleResponse> {
    return { slots: await domain.listSchedule(call.request.periodId) };
  },

  async DeleteScheduleSlot(
    call: Call<DeleteScheduleSlotRequest>,
  ): Promise<DeleteResponse> {
    await domain.deleteScheduleSlot(call.request.id);
    return { ok: true };
  },

  async CreateNote(call: Call<CreateNoteRequest>): Promise<Note> {
    return domain.createNote(call.request);
  },

  async ListNotes(call: Call<ListNotesRequest>): Promise<ListNotesResponse> {
    return { notes: await domain.listNotes(call.request) };
  },

  async UpdateNote(call: Call<UpdateNoteRequest>): Promise<Note> {
    return domain.updateNote(call.request);
  },

  async DeleteNote(call: Call<DeleteNoteRequest>): Promise<DeleteResponse> {
    await domain.deleteNote(call.request.id);
    return { ok: true };
  },
};
