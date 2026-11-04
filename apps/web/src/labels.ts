const ITEM_TYPES: Record<string, string> = {
  TASK: "Tarea",
  PROJECT: "Proyecto",
  EXAM: "Examen",
  ITEM_TYPE_UNSPECIFIED: "Actividad",
};

const ITEM_STATUS: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  DONE: "Hecho",
  SCHEDULED: "Programado",
  ITEM_STATUS_UNSPECIFIED: "Sin estado",
};

const NOTIF_KIND: Record<string, string> = {
  NORMAL: "Normal",
  PERSISTENT: "Persistente",
  NOTIFICATION_KIND_UNSPECIFIED: "Aviso",
};

const PERIOD_KIND: Record<string, string> = {
  TRIMESTER: "Trimestre",
  SEMESTER: "Semestre",
  CUSTOM: "Personalizado",
  PERIOD_KIND_UNSPECIFIED: "Periodo",
};

export const STUDY_TYPES = [
  { value: "university", label: "Universidad" },
  { value: "school", label: "Colegio / escuela" },
  { value: "course", label: "Curso libre" },
  { value: "language", label: "Idiomas" },
  { value: "other", label: "Otro" },
] as const;

export const DAYS = [
  { n: 1, label: "Lunes", short: "Lun" },
  { n: 2, label: "Martes", short: "Mar" },
  { n: 3, label: "Miércoles", short: "Mié" },
  { n: 4, label: "Jueves", short: "Jue" },
  { n: 5, label: "Viernes", short: "Vie" },
  { n: 6, label: "Sábado", short: "Sáb" },
  { n: 7, label: "Domingo", short: "Dom" },
] as const;

export function itemTypeLabel(type: string): string {
  return ITEM_TYPES[type] ?? type;
}

export function itemStatusLabel(status: string): string {
  return ITEM_STATUS[status] ?? status;
}

export function notifKindLabel(kind: string): string {
  return NOTIF_KIND[kind] ?? kind;
}

export function periodKindLabel(kind: string): string {
  return PERIOD_KIND[kind] ?? kind;
}

export function studyTypeLabel(value: string): string {
  return STUDY_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function formatWhen(iso: string): string {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleString("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const NEXT_STATUS: Record<string, string> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  SCHEDULED: "DONE",
  DONE: "PENDING",
};
