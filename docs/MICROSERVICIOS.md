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

---

## Los 2 servicios gRPC

### 1. `academic` (`services/academic`)

Dueño del dominio académico:

- periodos (trimestre / semestre)
- materias
- ítems (tarea, proyecto, examen)
- horario
- apuntes

Expone un **AcademicService** definido en `packages/proto/proto/academic.proto`.  
Puerto por defecto: **50051**.

### 2. `notifications` (`services/notifications`)

Dueño de los avisos:

- crear / listar
- marcar leído / descartar
- tipos **NORMAL** y **PERSISTENT**

Expone un **NotificationService** en `packages/proto/proto/notifications.proto`.  
Puerto por defecto: **50052**.

Cada uno arranca como proceso Node independiente (`pnpm dev:academic` / `pnpm dev:notifications`).

---

## Datos de ida y vuelta (comunicación bidireccional)

Los servicios **se llaman entre sí** por gRPC. No solo el gateway los llama.

### Ida: `academic` → `notifications`

Cuando creas un ítem **con fecha**, academic pide a notifications que cree un recordatorio persistente.

- Código: `services/academic/src/notifications-client.ts`
- Se usa desde el handler de `CreateItem`

### Vuelta: `notifications` → `academic`

Cuando lists avisos, si hay un `relatedItemId`, notifications pregunta a academic (`GetItem`) el título y la materia para enriquecer la respuesta.

- Código: `services/notifications/src/academic-client.ts`
- Se usa al mapear notificaciones en el listado

Eso es la **ida y vuelta**: A llama a B, y B también puede llamar a A.

---

## Base de datos en el servidor

PostgreSQL corre en Docker. Hay **dos bases** (mismo motor, datos separados):

| Servicio         | Base            | ORM    |
|------------------|-----------------|--------|
| academic         | `academic`      | Prisma |
| notifications    | `notifications` | Prisma |

Cada servicio **solo escribe en su BD**. No comparten tablas. Si necesitan datos del otro dominio, usan gRPC (como en la ida/vuelta).

Schemas:  
`services/academic/prisma/schema.prisma`  
`services/notifications/prisma/schema.prisma`

---

## Wrapper reutilizable

`packages/rpc-wrapper` encapsula lo repetible de un microservicio gRPC:

- `createGrpcServer` — bind del puerto, registro de handlers, logging, errores
- `createGrpcClient` — cliente con promesas y deadline
- helpers de error (`notFound`, `invalidArgument`, etc.)

**Quién lo usa:**

- `services/academic` (servidor + cliente hacia notifications)
- `services/notifications` (servidor + cliente hacia academic)
- `apps/gateway` (solo clientes hacia ambos)

Así no se copia el boilerplate de `@grpc/grpc-js` en cada servicio: se reutiliza el mismo wrapper.

---

## Contratos (`.proto`)

`packages/proto` guarda los contratos y cómo cargarlos.  
Cambiar un RPC implica actualizar el `.proto` y los handlers; el resto del monorepo consume ese paquete.

---

## Cómo verlo en la práctica

1. Arrancar DB + notifications + academic + gateway + web.
2. En Materias, crear un ítem **con fecha** → se crea aviso (ida).
3. En Perfil → Avisos → el aviso muestra título/materia del ítem (vuelta).
4. En código, abrir `rpc-wrapper` y los dos `*-client.ts` de los servicios.
