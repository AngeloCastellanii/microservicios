# Studyy — Microservicios académicos

**Studyy**: plataforma para estudiantes (cursos, tareas, proyectos, exámenes, horario, apuntes y avisos) con **2 microservicios gRPC**, PostgreSQL, gateway HTTP y frontend React.

## Arquitectura

```
apps/web (React) → apps/gateway (Fastify REST)
                      ├─ gRPC → services/academic (PostgreSQL: academic)
                      └─ gRPC → services/notifications (PostgreSQL: notifications)

Ida y vuelta:
  academic → notifications  (crea recordatorio PERSISTENT al crear actividad con fecha)
  notifications → academic  (enriquece listados con título/curso del ítem)
```

## Stack

- Node.js + TypeScript + PNPM
- gRPC + `@studyy/rpc-wrapper` (reutilizable)
- PostgreSQL (Docker)
- Prisma
- Fastify + React/Vite

## Requisitos

- Node >= 20
- PNPM >= 9
- Docker Desktop **en ejecución**

## Arranque

En PowerShell (sin `&&`):

```powershell
pnpm install
pnpm build:packages
pnpm dev:db
pnpm db:setup
```

PostgreSQL del proyecto usa el puerto **5434** (para no chocar con otros Postgres locales).

Abre **4 terminales** y corre **uno por terminal**:

```powershell
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

### Si dice `EADDRINUSE` / `No address added`

El puerto ya está ocupado por una instancia anterior. Cierra esa terminal o mata el proceso y vuelve a intentar.

## Estructura

```
packages/proto          Contratos .proto + tipos
packages/rpc-wrapper    Server/client gRPC + env/puertos
services/academic       Dominio académico (src/domain/) + BD
services/notifications  Avisos (src/domain/) + BD
apps/gateway            REST → gRPC
apps/web                UI React (estudiante)
docs/                   Explicación de microservicios
```

## Periodos y perfil

En **Perfil** configuras datos, tipo de estudio, periodo (trimestre / semestre / personalizado) y avisos. Cursos, horario y apuntes usan el periodo activo.

## Demo de RPC bidireccional

1. Crea una actividad con fecha en **Cursos** → academic llama a notifications.
2. Abre **Perfil → Avisos** → notifications llama a academic (`GetItem`) para mostrar título/curso.
3. Borra la actividad → se limpian avisos relacionados.

Explicación: [docs/MICROSERVICIOS.md](docs/MICROSERVICIOS.md).
