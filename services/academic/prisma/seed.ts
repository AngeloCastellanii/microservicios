import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(root, ".env") });

const prisma = new PrismaClient();

/** Limpia tablas. Sin datos de demo: todo se crea desde la UI. */
async function main() {
  await prisma.note.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.item.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.period.deleteMany();
  console.log("Academic seed OK · BD vacía");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
