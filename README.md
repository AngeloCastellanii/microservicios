# AcadFlow — Microservicios académicos

Plataforma de gestión académica (materias, tareas, proyectos, exámenes, horario, apuntes y notificaciones) con **2 microservicios gRPC**, PostgreSQL, gateway HTTP y frontend React.

## Stack

- Node.js + TypeScript + PNPM (monorepo)
- gRPC (`@grpc/grpc-js`)
- PostgreSQL (Docker)
- Prisma (servicios)
- Fastify (gateway)
- React + Vite (web)

## Estructura

```
packages/proto          # Contratos .proto + tipos generados
packages/shared         # Utilidades compartidas
packages/rpc-wrapper    # (próxima parte) wrapper gRPC reutilizable
services/academic       # (próxima parte)
services/notifications  # (próxima parte)
apps/gateway            # (más adelante)
apps/web                # (más adelante)
```

## Parte 1 — Scaffold (estado actual)

### Requisitos

- Node >= 20
- PNPM >= 9
- Docker Desktop

### Arranque

```bash
pnpm install
pnpm build:proto
pnpm dev:db
```

PostgreSQL queda en `localhost:5432` con bases `academic` y `notifications` (usuario/clave `acadflow`).

Copia de variables: `.env.example` → `.env` (ya incluido en local).

### Mockups UI

Ver `docs/mockups/`.

## Próximas partes

1. ~~Scaffold monorepo + Docker + protos~~
2. `packages/rpc-wrapper`
3. Servicio `academic`
4. Servicio `notifications`
5. Llamadas cruzadas
6. Gateway REST
7. Frontend
8. Seed + docs finales
