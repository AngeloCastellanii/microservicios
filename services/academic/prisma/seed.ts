import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(root, ".env") });

const prisma = new PrismaClient();

async function main() {
  await prisma.note.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.item.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.period.deleteMany();

  const period = await prisma.period.create({
    data: {
      name: "Trimestre 11 · 2026",
      kind: "TRIMESTER",
      year: 2026,
      isActive: true,
    },
  });

  const sd = await prisma.subject.create({
    data: {
      periodId: period.id,
      name: "Sistemas Distribuidos",
      description: "gRPC, microservicios y coordinación",
      color: "#0C3B2E",
    },
  });
  const bd = await prisma.subject.create({
    data: {
      periodId: period.id,
      name: "Bases de Datos",
      description: "Modelado y consultas",
      color: "#1F5F7A",
    },
  });

  await prisma.item.createMany({
    data: [
      {
        subjectId: sd.id,
        title: "Entrega RPC",
        type: "TASK",
        status: "PENDING",
        dueAt: new Date(Date.now() + 2 * 86400000),
      },
      {
        subjectId: sd.id,
        title: "Demo gRPC",
        type: "PROJECT",
        status: "IN_PROGRESS",
        dueAt: new Date(Date.now() + 3 * 86400000),
      },
      {
        subjectId: sd.id,
        title: "Parcial",
        type: "EXAM",
        status: "SCHEDULED",
        dueAt: new Date(Date.now() + 5 * 86400000),
      },
      {
        subjectId: bd.id,
        title: "Práctica SQL",
        type: "TASK",
        status: "PENDING",
        dueAt: new Date(Date.now() + 4 * 86400000),
      },
    ],
  });

  await prisma.scheduleSlot.createMany({
    data: [
      {
        subjectId: sd.id,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "12:00",
        label: "Clase",
      },
      {
        subjectId: bd.id,
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "16:00",
        label: "Lab",
      },
      {
        subjectId: sd.id,
        dayOfWeek: 3,
        startTime: "10:00",
        endTime: "12:00",
        label: "Clase",
      },
    ],
  });

  await prisma.note.createMany({
    data: [
      {
        periodId: period.id,
        subjectId: sd.id,
        title: "Wrapper gRPC",
        body: "Reutilizar createGrpcServer/createGrpcClient en ambos servicios.",
      },
      {
        periodId: period.id,
        title: "Recordatorio general",
        body: "Levantar Docker antes de pnpm dev:db",
      },
    ],
  });

  console.log("Academic seed OK · period", period.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
