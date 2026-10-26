const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as T;
}

export type Period = {
  id: string;
  name: string;
  kind: string;
  year: number;
  isActive: boolean;
};

export type Subject = {
  id: string;
  periodId: string;
  name: string;
  description: string;
  color: string;
};

export type Item = {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  type: string;
  status: string;
  dueAt: string;
  subjectName: string;
};

export type ScheduleSlot = {
  id: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string;
  subjectName: string;
};

export type Note = {
  id: string;
  periodId: string;
  subjectId: string;
  title: string;
  body: string;
  subjectName: string;
};

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  relatedItemTitle: string;
  relatedSubjectName: string;
  readAt: string;
  dismissedAt: string;
  createdAt: string;
};

function withParams(params: Record<string, string | boolean | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== undefined && v !== false) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const api = {
  listPeriods: () =>
    request<{ periods: Period[] }>("/api/periods").then((r) => r.periods),
  createPeriod: (body: Record<string, unknown>) =>
    request<Period>("/api/periods", { method: "POST", body: JSON.stringify(body) }),
  activatePeriod: (id: string) =>
    request<Period>(`/api/periods/${id}/activate`, { method: "POST" }),
  deletePeriod: (id: string) =>
    request(`/api/periods/${id}`, { method: "DELETE" }),

  listSubjects: (periodId?: string) =>
    request<{ subjects: Subject[] }>(
      `/api/subjects${withParams({ periodId })}`,
    ).then((r) => r.subjects),
  createSubject: (body: Record<string, unknown>) =>
    request<Subject>("/api/subjects", { method: "POST", body: JSON.stringify(body) }),
  deleteSubject: (id: string) =>
    request(`/api/subjects/${id}`, { method: "DELETE" }),

  listItems: (params: Record<string, string | boolean | number> = {}) =>
    request<{ items: Item[] }>(`/api/items${withParams(params)}`).then(
      (r) => r.items,
    ),
  createItem: (body: Record<string, unknown>) =>
    request<Item>("/api/items", { method: "POST", body: JSON.stringify(body) }),
  deleteItem: (id: string) => request(`/api/items/${id}`, { method: "DELETE" }),

  listSchedule: (periodId?: string) =>
    request<{ slots: ScheduleSlot[] }>(
      `/api/schedule${withParams({ periodId })}`,
    ).then((r) => r.slots),
  upsertSlot: (body: Record<string, unknown>) =>
    request<ScheduleSlot>("/api/schedule", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteSlot: (id: string) =>
    request(`/api/schedule/${id}`, { method: "DELETE" }),

  listNotes: (params: Record<string, string | boolean> = {}) =>
    request<{ notes: Note[] }>(`/api/notes${withParams(params)}`).then(
      (r) => r.notes,
    ),
  createNote: (body: Record<string, unknown>) =>
    request<Note>("/api/notes", { method: "POST", body: JSON.stringify(body) }),
  deleteNote: (id: string) => request(`/api/notes/${id}`, { method: "DELETE" }),

  listNotifications: () =>
    request<{ notifications: Notification[] }>("/api/notifications").then(
      (r) => r.notifications,
    ),
  markRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: "POST" }),
  dismiss: (id: string) =>
    request(`/api/notifications/${id}/dismiss`, { method: "POST" }),
};
