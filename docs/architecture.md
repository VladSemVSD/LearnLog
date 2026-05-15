# Architecture

Condensed reference. The full plan lives at `C:\Users\ashir\.claude\plans\learning-portal-recursive-backus.md`.

## Layers

```
UI (RSC by default)
  ↓
Server actions / RSC queries  (features/<f>/server/)
  ↓
Service                       (features/<f>/service.ts)  — only layer to touch Prisma
  ↓
Prisma + Postgres (Neon)
```

## Folder layout

```
app/                   # Next.js routes (route groups: (auth), (app))
features/              # Feature slices: learning-items, tags, dashboard, auth
components/            # ui/ (shadcn) · layout/ · shared/
lib/                   # db.ts, auth.ts, utils.ts, generated/prisma/
prisma/                # schema.prisma, migrations/
docs/                  # this file
```

## Domain model

Single `LearningItem` table keyed by `type` enum. Tags are an explicit M-N join via `LearningItemTag`.

| Field           | Notes                                         |
| --------------- | --------------------------------------------- |
| `type`          | PROJECT \| COURSE \| CERTIFICATION \| VIDEO \| BOOK \| MISC |
| `status`        | BACKLOG → PLANNED → IN_PROGRESS → PAUSED \| COMPLETED \| DROPPED |
| `priority`      | 0–3                                           |
| `progressPercent` | 0–100                                       |
| `estimatedHours` / `actualHours` | floats, optional         |
| `sourceUrl`     | optional canonical link                       |
| `notes`         | markdown, optional                            |

Indexes: composite `[userId, status]`, `[userId, type]`, `[userId, updatedAt DESC]`.

## Server actions contract

Every action returns:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Every action body:

1. `const user = await requireUser()`
2. `const parsed = schema.safeParse(input)` — return `fieldErrors` on failure
3. Call `service.fn(user.id, parsed.data)`
4. `revalidatePath(...)` for affected routes
5. Return `{ ok: true, data }`

## Auth

BetterAuth + Prisma adapter, email/password. Sessions in DB. The `(app)` layout enforces `requireUser()`; the `(auth)` group renders sign-in/sign-up.

## Future extensibility hooks

- New item types → add enum value, ship.
- Roadmaps → new table referencing `LearningItem.id`; no schema churn elsewhere.
- AI features → new feature folder, consumes `service.ts` like any UI does.
- Analytics → new aggregate queries in `features/<feature>/server/queries.ts`; no new tables initially.
