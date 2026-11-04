import { api, type Period } from "./api";

export async function exportPeriodJson(period: Period) {
  const [subjects, items, slots, notes, notifications] = await Promise.all([
    api.listSubjects(period.id),
    api.listItems({ periodId: period.id }),
    api.listSchedule(period.id),
    api.listNotes({ periodId: period.id }),
    api.listNotifications(),
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

  const payload = {
    exportedAt: new Date().toISOString(),
    period,
    subjects,
    items,
    schedule: slots,
    notes: notesWithPhotos.map((note) => ({
      ...note,
      images: note.images.map((image) => ({
        id: image.id,
        mime: image.mime,
        hasData: Boolean(image.data),
        dataLength: image.data?.length ?? 0,
      })),
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      relatedItemTitle: n.relatedItemTitle,
      relatedSubjectName: n.relatedSubjectName,
      createdAt: n.createdAt,
      readAt: n.readAt,
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
