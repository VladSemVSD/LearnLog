# Architecture

Condensed reference. The full plan lives at `C:\Users\ashir\.claude\plans\learning-portal-recursive-backus.md`.

## Layers

```
UI (RSC by default)
  │
  ├── reads ──→ Service        (features/<f>/service.ts)
  │
  └── writes ─→ Server actions (features/<f>/server/actions.ts)
                  ↓
                Service        (features/<f>/service.ts)  — only layer to touch Prisma
                  ↓
                Prisma + Postgres (Neon)
```

RSC pages call services directly with `requireUser().id`. There is no
intermediate `server/queries.ts` layer — wrappers that only forwarded
`(userId, ...)` added no leverage and were removed. The `server/actions.ts`
file remains because the `"use server"` directive boundary is real:
writes need it, reads don't.

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

An item's **lifecycle** is its `status` plus the dependent fields that move with it: `startedAt`, `completedAt`, and `progressPercent` when forced (e.g. setting status to COMPLETED forces 100%). The lifecycle rules live in `features/learning-items/lifecycle.ts` as a pure function `applyLifecycleIntent(current, intent, now?)` returning `{ patch, prompts }`. Every write to a LearningItem's status or progress goes through it, so the rules can't drift across call sites. Unit tests in `features/learning-items/lifecycle.test.ts`.

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

## Caching

Reads are wrapped in **cache namespaces** (`lib/cache.ts` → `createCacheNamespace`). Each feature owns its namespace: `itemsCache` in `features/learning-items/cache.ts`, `tagsCache` in `features/tags/cache.ts`. The namespace owns the tag format (`${key}:${userId}` — user-scoped), the default TTL (1 hour), and any cross-namespace **cascades**.

Cascades are declared inline: `tagsCache` cascades to `itemsCache` because tag chips render on item rows. When a server action invalidates `tagsCache`, both tags and items get refreshed; the rule lives next to the cache, not in the action.

Services call `namespace.wrap(userId, keyParts, fn)` instead of `unstable_cache` directly. Actions list which namespaces they write to via the runner's `invalidates` field. Cascades are one-level, not transitive.

## Auth

BetterAuth + Prisma adapter, email/password. Sessions in DB. The `(app)` layout enforces `requireUser()`; the `(auth)` group renders sign-in/sign-up.

## Future extensibility hooks

- New item types → add enum value, ship.
- Roadmaps → new table referencing `LearningItem.id`; no schema churn elsewhere.
- AI features → new feature folder, consumes `service.ts` like any UI does.
- Analytics → new aggregate queries in `features/<feature>/server/queries.ts`; no new tables initially.
