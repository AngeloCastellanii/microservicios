/** Tipos alineados con academic.proto / notifications.proto */

export type PeriodKind =
  | "PERIOD_KIND_UNSPECIFIED"
  | "TRIMESTER"
  | "SEMESTER";

export type ItemType = "ITEM_TYPE_UNSPECIFIED" | "TASK" | "PROJECT" | "EXAM";
export type ItemStatus =
  | "ITEM_STATUS_UNSPECIFIED"
  | "PENDING"
  | "IN_PROGRESS"
  | "DONE"
  | "SCHEDULED";

export type NotificationKind =
  | "NOTIFICATION_KIND_UNSPECIFIED"
  | "NORMAL"
  | "PERSISTENT";

export interface DeleteResponse {
  ok: boolean;
}

export interface Period {
  id: string;
  name: string;
  kind: PeriodKind;
  year: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePeriodRequest {
  name: string;
  kind: PeriodKind;
  year: number;
  setActive?: boolean;
}

export interface ListPeriodsRequest {}

export interface ListPeriodsResponse {
  periods: Period[];
}

export interface SetActivePeriodRequest {
  id: string;
}

export interface DeletePeriodRequest {
  id: string;
}

export interface Subject {
  id: string;
  periodId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectRequest {
  periodId: string;
  name: string;
  description?: string;
  color?: string;
}

export interface ListSubjectsRequest {
  periodId?: string;
}

export interface ListSubjectsResponse {
  subjects: Subject[];
}

export interface GetSubjectRequest {
  id: string;
}

export interface UpdateSubjectRequest {
  id: string;
  name?: string;
  description?: string;
  color?: string;
}

export interface DeleteSubjectRequest {
  id: string;
}

export interface Item {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  type: ItemType;
  status: ItemStatus;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  subjectName: string;
}

export interface CreateItemRequest {
  subjectId: string;
  title: string;
  description?: string;
  type: ItemType;
  status?: ItemStatus;
  dueAt?: string;
}

export interface ListItemsRequest {
  subjectId?: string;
  periodId?: string;
  type?: ItemType;
  upcomingOnly?: boolean;
  limit?: number;
}

export interface ListItemsResponse {
  items: Item[];
}

export interface GetItemRequest {
  id: string;
}

export interface UpdateItemRequest {
  id: string;
  title?: string;
  description?: string;
  type?: ItemType;
  status?: ItemStatus;
  dueAt?: string;
}

export interface DeleteItemRequest {
  id: string;
}

export interface ScheduleSlot {
  id: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  subjectName: string;
}

export interface UpsertScheduleSlotRequest {
  id?: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label?: string;
}

export interface ListScheduleRequest {
  periodId?: string;
}

export interface ListScheduleResponse {
  slots: ScheduleSlot[];
}

export interface DeleteScheduleSlotRequest {
  id: string;
}

export interface Note {
  id: string;
  periodId: string;
  subjectId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  subjectName: string;
}

export interface CreateNoteRequest {
  periodId?: string;
  subjectId?: string;
  title: string;
  body?: string;
}

export interface ListNotesRequest {
  periodId?: string;
  subjectId?: string;
  generalOnly?: boolean;
}

export interface ListNotesResponse {
  notes: Note[];
}

export interface UpdateNoteRequest {
  id: string;
  title?: string;
  body?: string;
  subjectId?: string;
}

export interface DeleteNoteRequest {
  id: string;
}

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  relatedItemId: string;
  relatedItemTitle: string;
  relatedSubjectName: string;
  readAt: string;
  dismissedAt: string;
  createdAt: string;
}

export interface CreateNotificationRequest {
  kind: NotificationKind;
  title: string;
  body?: string;
  relatedItemId?: string;
}

export interface ListNotificationsRequest {
  includeDismissed?: boolean;
  unreadOnly?: boolean;
  kind?: NotificationKind;
}

export interface ListNotificationsResponse {
  notifications: Notification[];
}

export interface MarkReadRequest {
  id: string;
}

export interface DismissRequest {
  id: string;
}

export interface GetNotificationRequest {
  id: string;
}
