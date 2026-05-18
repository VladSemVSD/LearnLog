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

The contract is owned by the **action runner** in `lib/actions.ts`. Action
files (`features/<f>/server/actions.ts`) declare actions via `defineAction`:

```ts
export const createItemAction = defineAction({
  schema: createItemSchema,
  invalidates: ["items"],       // cache namespace prefixes; runner appends `:${userId}`
  service: (userId, input) => createItem(userId, input),
  map: (item) => ({ id: item.id }),
});
```

The runner handles, in order, for every action:

1. `requireUser()`
2. `schema.safeParse(input)` — returns `fieldErrors` on failure
3. Calls the `service` lambda with `(userId, parsedInput)`
4. If the service returns `null` → `{ ok: false, error: "Not found." }`
5. Calls `updateTag` for each `${prefix}:${userId}` in `invalidates`
   (Next 16's read-your-own-writes API for `unstable_cache` tags)
6. Returns `{ ok: true, data: map(result) }`

Domain-error short-circuit: a service lambda can `throw new ActionError({error,
fieldErrors})` for translated errors (e.g. Prisma P2002 unique violations). The
runner catches it and returns the envelope. Use `isUniqueViolation(err)` to
detect P2002.

## Auth

BetterAuth + Prisma adapter, email/password. Sessions in DB. The `(app)` layout enforces `requireUser()`; the `(auth)` group renders sign-in/sign-up.

## Future extensibility hooks

- New item types → add enum value, ship.
- Roadmaps → new table referencing `LearningItem.id`; no schema churn elsewhere.
- AI features → new feature folder, consumes `service.ts` like any UI does.
- Analytics → new aggregate queries in `features/<feature>/server/queries.ts`; no new tables initially.
