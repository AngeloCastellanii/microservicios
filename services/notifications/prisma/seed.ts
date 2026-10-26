import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(root, ".env") });

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.notification.createMany({
    data: [
      {
        kind: "NORMAL",
        title: "Bienvenido",
        body: "Microservicios academic y notifications listos.",
      },
      {
        kind: "PERSISTENT",
        title: "Recordatorio de demo",
        body: "Prepara la demo de ida y vuelta gRPC para clase.",
      },
    ],
  });
  console.log("Notifications seed OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
