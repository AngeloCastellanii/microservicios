# Studyy — microservicios explicados

Studyy no es una sola API monolítica. Son **procesos separados** que se hablan por red con **gRPC**, cada uno con su lógica y (cuando aplica) su base de datos.

## Vista general

```
apps/web (React)
      │  HTTP REST
      ▼
apps/gateway (Fastify)
      │  gRPC
      ├──────────────────▶ services/academic     :50051  + BD academic
      └──────────────────▶ services/notifications :50052  + BD notifications
```

El front solo habla HTTP. El **gateway** traduce REST → gRPC. Los dos microservicios no dependen del front; podrían usarse desde otro cliente.

## Los 2 servicios gRPC

### 1. `academic` (`services/academic`)

Dueño del dominio académico:

- periodos (trimestre / semestre / personalizado)
- cursos (subjects)
- actividades (tarea, proyecto, examen)
- horario
- apuntes

La lógica de negocio vive en `services/academic/src/domain/`.  
Los handlers solo orquestan gRPC → dominio.

Puerto: **50051**.

### 2. `notifications` (`services/notifications`)

Dueño de los avisos:

- crear / listar
- marcar leído / descartar
- borrar por `relatedItemId`
- tipos **NORMAL** y **PERSISTENT**

Dominio: `services/notifications/src/domain/`.  
Puerto: **50052**.

## Comunicación bidireccional

### Ida: `academic` → `notifications`

Al crear una actividad **con fecha**, academic pide un recordatorio persistente.

- `services/academic/src/notifications-client.ts`

### Vuelta: `notifications` → `academic`

Al listar avisos, si hay `relatedItemId`, notifications llama `GetItem` para enriquecer título/curso.

- `services/notifications/src/academic-client.ts`

Al borrar una actividad, academic llama `DeleteByRelatedItem` para limpiar avisos huérfanos.

## Base de datos

PostgreSQL en Docker, **dos bases**:

| Servicio      | Base            |
| ------------- | --------------- |
| academic      | `academic`      |
| notifications | `notifications` |

Schemas Prisma en cada servicio. No comparten tablas.

## Wrapper reutilizable

`packages/rpc-wrapper`:

- `createGrpcServer` / `createGrpcClient`
- errores tipados
- `DEFAULT_PORTS`, `envInt` (antes en `@studyy/shared`, fusionado aquí)

Packages del monorepo: **`proto`** + **`rpc-wrapper`**.

## Archivos importantes

### Contratos

| Archivo | Para qué |
| --- | --- |
| `packages/proto/proto/academic.proto` | AcademicService |
| `packages/proto/proto/notifications.proto` | NotificationService (+ DeleteByRelatedItem) |
| `packages/proto/src/types.ts` | Tipos TS alineados |

### Academic

| Archivo | Para qué |
| --- | --- |
| `services/academic/src/domain/` | Objetos de negocio (Period, Subject, Item, …) |
| `services/academic/src/handlers.ts` | Orquesta RPC → domain |
| `services/academic/src/notifications-client.ts` | Ida + limpieza de avisos |
| `services/academic/prisma/schema.prisma` | Tablas |

### Notifications

| Archivo | Para qué |
| --- | --- |
| `services/notifications/src/domain/` | Objeto Notification |
| `services/notifications/src/handlers.ts` | Orquesta RPC → domain |
| `services/notifications/src/academic-client.ts` | Vuelta GetItem |

### Gateway y web

| Archivo | Para qué |
| --- | --- |
| `apps/gateway/src/routes.ts` | REST → gRPC |
| `apps/web/src/api.ts` | Cliente HTTP |
| `apps/web/src/pages/*` | UI estudiante (cursos, horario, apuntes, perfil) |

## Cómo verlo

1. Arrancar DB + notifications + academic + gateway + web.
2. En Cursos, crear actividad **con fecha** → aviso (ida).
3. En Perfil → Avisos → título/curso del ítem (vuelta).
4. Borrar la actividad → se limpian avisos relacionados.
