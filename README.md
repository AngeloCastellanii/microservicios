# AcadFlow — Microservicios académicos

Plataforma de gestión académica (materias, tareas, proyectos, exámenes, horario, apuntes y notificaciones) con **2 microservicios gRPC**, PostgreSQL, gateway HTTP y frontend React.

## Arquitectura

```
apps/web (React) → apps/gateway (Fastify REST)
                      ├─ gRPC → services/academic (PostgreSQL: academic)
                      └─ gRPC → services/notifications (PostgreSQL: notifications)

Ida y vuelta:
  academic → notifications  (crea recordatorio PERSISTENT al crear ítem con fecha)
  notifications → academic  (enriquece listados con título/materia del ítem)
```

## Stack

- Node.js + TypeScript + PNPM
- gRPC + `@acadflow/rpc-wrapper` (reutilizable)
- PostgreSQL (Docker)
- Prisma
- Fastify + React/Vite

## Requisitos

- Node >= 20
- PNPM >= 9
- Docker Desktop **en ejecución**

## Arranque

```bash
pnpm install
pnpm build:packages
pnpm dev:db
pnpm db:generate
pnpm db:push
pnpm db:seed
```

PostgreSQL del proyecto usa el puerto **5434** (para no chocar con otros Postgres locales).

En **4 terminales**:

```bash
pnpm dev:notifications
pnpm dev:academic
pnpm dev:gateway
pnpm dev:web
```

- Web: http://localhost:5173  
- Gateway: http://localhost:3010/health  
- Academic gRPC: `50051`  
- Notifications gRPC: `50052`  
- Postgres: `127.0.0.1:5434`

## Estructura

```
packages/proto          Contratos .proto + tipos
packages/shared         Utilidades
packages/rpc-wrapper    Server/client gRPC reutilizable
services/academic       Dominio académico + BD
services/notifications  Notificaciones NORMAL/PERSISTENT + BD
apps/gateway            REST → gRPC
apps/web                UI React
docs/mockups            Referencias visuales
```

## Demo de RPC bidireccional

1. Crea un ítem con fecha en **Materias** → academic llama a notifications.
2. Abre **Notificaciones** → notifications llama a academic (`GetItem`) para mostrar título/materia.
