import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaClient as AcademicClient } from "../../academic/src/generated/prisma/index.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({ path: path.join(root, ".env") });

const prisma = new PrismaClient();
const academic = new AcademicClient();

async function main() {
  await prisma.notification.deleteMany();

  const upcoming = await academic.item.findMany({
    where: {
      dueAt: { not: null },
      status: { not: "DONE" },
    },
    include: { subject: true },
    orderBy: { dueAt: "asc" },
    take: 6,
  });

  for (const item of upcoming) {
    if (!item.dueAt) continue;
    await prisma.notification.create({
      data: {
        kind: "PERSISTENT",
        title: `Recordatorio: ${item.title}`,
        body: `${item.subject.name} · vence ${item.dueAt.toLocaleString("es")}`,
        relatedItemId: item.id,
      },
    });
  }

  await prisma.notification.create({
    data: {
      kind: "NORMAL",
      title: "Bienvenido a Studyy",
      body: "Explora Cursos, Horario y Apuntes con los datos de demo.",
    },
  });

  console.log(`Notifications seed OK · ${upcoming.length + 1} avisos de demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await academic.$disconnect();
  });
