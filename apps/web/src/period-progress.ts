export type PeriodProgress = {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  percent: number;
  currentWeek: number;
  totalWeeks: number;
  started: boolean;
  finished: boolean;
};

function dayStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dayDiff(later: Date, earlier: Date): number {
  const ms = dayStart(later).getTime() - dayStart(earlier).getTime();
  return Math.round(ms / 86_400_000);
}

export function toDateInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function periodProgress(
  startsAt?: string,
  endsAt?: string,
  today = new Date(),
): PeriodProgress | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (dayStart(end) < dayStart(start)) return null;

  const totalDays = dayDiff(end, start) + 1;
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const before = dayStart(today) < dayStart(start);
  const after = dayStart(today) > dayStart(end);

  const elapsedDays = before
    ? 0
    : Math.min(totalDays, dayDiff(today, start) + 1);
  const remainingDays = after ? 0 : dayDiff(end, today);
  const currentWeek = before
    ? 0
    : Math.min(totalWeeks, Math.floor(dayDiff(today, start) / 7) + 1);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    percent: Math.round((elapsedDays / totalDays) * 100),
    currentWeek,
    totalWeeks,
    started: !before,
    finished: after,
  };
}
