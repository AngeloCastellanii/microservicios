import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/index.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({ path: path.join(root, ".env") });

const prisma = new PrismaClient();

async function main() {
  await prisma.note.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.item.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.period.deleteMany();

  const year = new Date().getFullYear();
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const startsAt = new Date(today);
  startsAt.setDate(today.getDate() - weekday - 9 * 7);
  startsAt.setHours(0, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setDate(startsAt.getDate() + 13 * 7 - 1);
  endsAt.setHours(23, 59, 0, 0);

  const period = await prisma.period.create({
    data: {
      name: `Trimestre ${year}`,
      kind: "TRIMESTER",
      year,
      isActive: true,
      startsAt,
      endsAt,
    },
  });

  const courses = [
    {
      name: "Programación móvil",
      description: "Apps nativas y multiplataforma",
      color: "#0C3B2E",
    },
    {
      name: "Sistemas distribuidos",
      description: "Servicios, gRPC y consistencia",
      color: "#1F5F7A",
    },
    {
      name: "Seguridad informática",
      description: "Amenazas, controles y prácticas",
      color: "#9B2C2C",
    },
    {
      name: "Web 2",
      description: "Frontend moderno y APIs",
      color: "#146049",
    },
    {
      name: "Tesis 1",
      description: "Planteamiento y estado del arte",
      color: "#8B5A2B",
    },
    {
      name: "Herramientas para el desempeño de un profesional exitoso",
      description: "Hábitos, comunicación y gestión",
      color: "#3D4741",
    },
  ];

  const created = [];
  for (const course of courses) {
    created.push(
      await prisma.subject.create({
        data: { periodId: period.id, ...course },
      }),
    );
  }

  const [movil, dist, seg, web, tesis, herr] = created;

  const inDays = (days: number, hour = 18) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await prisma.item.createMany({
    data: [
      {
        subjectId: movil.id,
        title: "App de notas offline",
        description: "Persistencia local y sync",
        type: "PROJECT",
        status: "IN_PROGRESS",
        dueAt: inDays(8),
      },
      {
        subjectId: movil.id,
        title: "Quiz navegación",
        description: "Stacks y tabs",
        type: "EXAM",
        status: "SCHEDULED",
        dueAt: inDays(4, 9),
      },
      {
        subjectId: dist.id,
        title: "Demo gRPC bidireccional",
        description: "Dos servicios y un gateway",
        type: "PROJECT",
        status: "IN_PROGRESS",
        dueAt: inDays(12),
      },
      {
        subjectId: dist.id,
        title: "Lectura consistencia eventual",
        description: "Capítulo de réplicas",
        type: "TASK",
        status: "PENDING",
        dueAt: inDays(2),
      },
      {
        subjectId: seg.id,
        title: "Informe de amenazas",
        description: "Caso de phishing y mitigación",
        type: "TASK",
        status: "PENDING",
        dueAt: inDays(6),
      },
      {
        subjectId: seg.id,
        title: "Parcial criptografía",
        description: "Simétrica vs asimétrica",
        type: "EXAM",
        status: "SCHEDULED",
        dueAt: inDays(15, 8),
      },
      {
        subjectId: web.id,
        title: "Landing con estados",
        description: "Empty, loading y error",
        type: "TASK",
        status: "DONE",
        dueAt: inDays(-1),
      },
      {
        subjectId: web.id,
        title: "Proyecto dashboard",
        description: "Consumo de API REST",
        type: "PROJECT",
        status: "IN_PROGRESS",
        dueAt: inDays(9),
      },
      {
        subjectId: tesis.id,
        title: "Problema de investigación",
        description: "Una página, pregunta clara",
        type: "TASK",
        status: "IN_PROGRESS",
        dueAt: inDays(5),
      },
      {
        subjectId: tesis.id,
        title: "Estado del arte",
        description: "Mínimo 8 fuentes",
        type: "PROJECT",
        status: "PENDING",
        dueAt: inDays(20),
      },
      {
        subjectId: herr.id,
        title: "Plan semanal",
        description: "Bloques de estudio y descanso",
        type: "TASK",
        status: "PENDING",
        dueAt: inDays(1, 20),
      },
      {
        subjectId: herr.id,
        title: "Presentación de 5 minutos",
        description: "Pitch de un hábito profesional",
        type: "PROJECT",
        status: "SCHEDULED",
        dueAt: inDays(11, 16),
      },
    ],
  });

  await prisma.scheduleSlot.createMany({
    data: [
      { subjectId: movil.id, dayOfWeek: 1, startTime: "08:00", endTime: "10:00", label: "Lab" },
      { subjectId: dist.id, dayOfWeek: 1, startTime: "10:00", endTime: "12:00", label: "Teoría" },
      { subjectId: web.id, dayOfWeek: 2, startTime: "08:00", endTime: "10:00", label: "" },
      { subjectId: seg.id, dayOfWeek: 2, startTime: "14:00", endTime: "16:00", label: "Taller" },
      { subjectId: tesis.id, dayOfWeek: 3, startTime: "16:00", endTime: "18:00", label: "Tutoría" },
      { subjectId: herr.id, dayOfWeek: 4, startTime: "10:00", endTime: "12:00", label: "" },
      { subjectId: movil.id, dayOfWeek: 5, startTime: "08:00", endTime: "10:00", label: "Revisión" },
      { subjectId: dist.id, dayOfWeek: 5, startTime: "14:00", endTime: "16:00", label: "Lab" },
    ],
  });

  const grpcItem = await prisma.item.findFirst({
    where: { title: "Demo gRPC bidireccional" },
  });
  const tesisItem = await prisma.item.findFirst({
    where: { title: "Problema de investigación" },
  });

  await prisma.note.createMany({
    data: [
      {
        periodId: period.id,
        subjectId: dist.id,
        itemId: grpcItem?.id,
        title: "Ida y vuelta gRPC",
        body: "Academic crea el recordatorio. Notifications pide GetItem para enriquecer el aviso.",
      },
      {
        periodId: period.id,
        subjectId: movil.id,
        title: "Offline first",
        body: "Guardar local, marcar dirty y sincronizar cuando haya red.",
      },
      {
        periodId: period.id,
        subjectId: seg.id,
        title: "Principio de mínimo privilegio",
        body: "Cada servicio solo accede a su propia base.",
      },
      {
        periodId: period.id,
        subjectId: tesis.id,
        itemId: tesisItem?.id,
        title: "Pregunta tentativa",
        body: "¿Cómo afecta la latencia entre microservicios a la experiencia del estudiante?",
      },
      {
        periodId: period.id,
        subjectId: null,
        title: "Semana cargada",
        body: "Priorizar demo de distribuidos y el problema de tesis.",
      },
    ],
  });

  console.log(`Academic seed OK · ${created.length} cursos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
