# Studyy — qué cumple el proyecto

## Pedido del curso

| Requisito | Cómo está |
|---|---|
| 2 servicios RPC | `services/academic` (gRPC `:50051`) y `services/notifications` (gRPC `:50052`) |
| Datos de ida y vuelta | academic → notifications al crear ítem con fecha; notifications → academic al listar avisos (`GetItem`) |
| BD en el servidor | PostgreSQL; cada servicio con su base (`academic` / `notifications`) vía Prisma |
| Wrapper reutilizable | `packages/rpc-wrapper` (`createGrpcServer` / `createGrpcClient`) usado por ambos servicios y el gateway |

## Flujo

```
Web (React) → Gateway REST → gRPC → academic
                                 → notifications
```

## Dominio Studyy

Materias, tareas/proyectos/exámenes, horario, apuntes, periodos (trimestre/semestre), avisos. Configuración y avisos en **Perfil**.

## Arranque corto

```powershell
pnpm install
pnpm build:packages
pnpm dev:db
pnpm db:setup
```

Cuatro terminales: `pnpm dev:notifications` · `pnpm dev:academic` · `pnpm dev:gateway` · `pnpm dev:web`
