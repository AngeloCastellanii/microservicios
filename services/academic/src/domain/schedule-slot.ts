import type { ScheduleSlot } from "@studyy/proto";
import { invalidArgument, notFound } from "@studyy/rpc-wrapper";
import type { ScheduleSlot as DbSlot } from "../generated/prisma/index.js";
import { prisma } from "../db.js";

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

export function mapSlot(
  row: DbSlot & { subject?: { name: string } | null },
): ScheduleSlot {
  return {
    id: row.id,
    subjectId: row.subjectId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    label: row.label,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    subjectName: row.subject?.name ?? "",
  };
}

export async function upsertScheduleSlot(input: {
  id?: string;
  subjectId?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  label?: string;
}): Promise<ScheduleSlot> {
  if (
    !input.subjectId ||
    !input.dayOfWeek ||
    input.dayOfWeek < 1 ||
    input.dayOfWeek > 7
  ) {
    throw invalidArgument("subjectId and dayOfWeek (1-7) are required");
  }
  if (!input.startTime || !input.endTime) {
    throw invalidArgument("startTime and endTime are required");
  }

  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
  });
  if (!subject) throw notFound("Subject not found");

  const data = {
    subjectId: input.subjectId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    label: input.label ?? "",
  };

  const row = input.id
    ? await prisma.scheduleSlot.update({
        where: { id: input.id },
        data,
        include: { subject: true },
      })
    : await prisma.scheduleSlot.create({
        data,
        include: { subject: true },
      });

  return mapSlot(row);
}

export async function listSchedule(periodId?: string): Promise<ScheduleSlot[]> {
  const rows = await prisma.scheduleSlot.findMany({
    where: periodId ? { subject: { periodId } } : undefined,
    include: { subject: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return rows.map(mapSlot);
}

export async function deleteScheduleSlot(id: string): Promise<void> {
  try {
    await prisma.scheduleSlot.delete({ where: { id } });
  } catch {
    throw notFound("Schedule slot not found");
  }
}
