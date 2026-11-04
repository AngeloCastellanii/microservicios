import { api, type Period } from "./api";

export type PeriodBackup = {
  exportedAt?: string;
  period: {
    name: string;
    kind: string;
    year: number;
    startsAt?: string;
    endsAt?: string;
  };
  subjects: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
  }>;
  items: Array<{
    id: string;
    subjectId: string;
    title: string;
    description: string;
    type: string;
    status: string;
    dueAt: string;
  }>;
  schedule: Array<{
    subjectId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    label: string;
  }>;
  notes: Array<{
    subjectId?: string;
    itemId?: string;
    title: string;
    body: string;
    images?: Array<{ mime?: string; data?: string }>;
  }>;
};

export async function exportPeriodJson(period: Period) {
  const [subjects, items, slots, notes] = await Promise.all([
    api.listSubjects(period.id),
    api.listItems({ periodId: period.id }),
    api.listSchedule(period.id),
    api.listNotes({ periodId: period.id }),
  ]);

  const notesWithPhotos = await Promise.all(
    notes.map(async (note) => ({
      ...note,
      images: await Promise.all(
        note.images.map(async (image) => {
          try {
            return await api.getNoteImage(image.id);
          } catch {
            return image;
          }
        }),
      ),
    })),
  );

  const payload: PeriodBackup = {
    exportedAt: new Date().toISOString(),
    period: {
      name: period.name,
      kind: period.kind,
      year: period.year,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
    },
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      color: s.color,
    })),
    items: items.map((item) => ({
      id: item.id,
      subjectId: item.subjectId,
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      dueAt: item.dueAt,
    })),
    schedule: slots.map((slot) => ({
      subjectId: slot.subjectId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: slot.label,
    })),
    notes: notesWithPhotos.map((note) => ({
      subjectId: note.subjectId || undefined,
      itemId: note.itemId || undefined,
      title: note.title,
      body: note.body,
      images: note.images
        .filter((image) => image.data)
        .map((image) => ({
          mime: image.mime || "image/jpeg",
          data: image.data,
        })),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `studyy-${period.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importPeriodJson(file: File): Promise<Period> {
  const text = await file.text();
  const raw = JSON.parse(text) as PeriodBackup;
  if (!raw?.period?.name || !Array.isArray(raw.subjects)) {
    throw new Error("El JSON no parece una copia de Studyy");
  }

  const kind =
    raw.period.kind === "SEMESTER" || raw.period.kind === "CUSTOM"
      ? raw.period.kind
      : "TRIMESTER";

  const created = await api.createPeriod({
    name: raw.period.name,
    kind,
    year: raw.period.year || new Date().getFullYear(),
    startsAt: raw.period.startsAt || "",
    endsAt: raw.period.endsAt || "",
    setActive: true,
  });
  await api.activatePeriod(created.id).catch(() => undefined);

  const subjectMap = new Map<string, string>();
  for (const subject of raw.subjects) {
    const next = await api.createSubject({
      periodId: created.id,
      name: subject.name,
      description: subject.description || "",
      color: subject.color || "#0D9488",
    });
    subjectMap.set(subject.id, next.id);
  }

  const itemMap = new Map<string, string>();
  for (const item of raw.items || []) {
    const subjectId = subjectMap.get(item.subjectId);
    if (!subjectId) continue;
    const next = await api.createItem({
      subjectId,
      title: item.title,
      description: item.description || "",
      type: item.type || "TASK",
      status: item.status || "PENDING",
      dueAt: item.dueAt || "",
    });
    itemMap.set(item.id, next.id);
  }

  for (const slot of raw.schedule || []) {
    const subjectId = subjectMap.get(slot.subjectId);
    if (!subjectId) continue;
    await api.upsertSlot({
      subjectId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: slot.label || "",
    });
  }

  for (const note of raw.notes || []) {
    const subjectId = note.subjectId
      ? subjectMap.get(note.subjectId) || ""
      : "";
    const itemId = note.itemId ? itemMap.get(note.itemId) || "" : "";
    const saved = await api.createNote({
      periodId: created.id,
      title: note.title,
      body: note.body || "",
      subjectId: subjectId || undefined,
      itemId: itemId || undefined,
    });
    for (const image of note.images || []) {
      if (!image.data) continue;
      await api.addNoteImage(saved.id, {
        mime: image.mime || "image/jpeg",
        data: image.data,
      });
    }
  }

  return created;
}
