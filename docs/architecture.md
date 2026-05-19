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
  invalidates: [itemsCache],    // cache namespace objects; runner calls .invalidate(userId)
  service: (userId, input) => createItem(userId, input),
  map: (item) => ({ id: item.id }),
});
```

The runner handles, in order, for every action:

1. `requireUser()`
2. `schema.safeParse(input)` — returns `fieldErrors` on failure
3. Calls the `service` lambda with `(userId, parsedInput)`
4. If the service returns `null` → `{ ok: false, error: "Not found." }`
5. Calls `namespace.invalidate(userId)` for each entry in `invalidates`
   (the namespace fires `updateTag` for its own tag + any declared cascades)
6. Returns `{ ok: true, data: map(result) }`

Domain-error short-circuit: a service lambda can `throw new ActionError({error,
fieldErrors})` for translated errors (e.g. Prisma P2002 unique violations). The
runner catches it and returns the envelope. Use `isUniqueViolation(err)` to
detect P2002.

## Caching

Page-render caching via Next 16's `"use cache"` directive (gated by the top-level `cacheComponents` flag in `next.config.ts`). The cached subtree is the rendered RSC payload — DB result + JSX — keyed by its arguments and invalidated by tag. Full decision in `docs/adr/0001-use-cache-render-level.md`.

**Cache namespaces** (`lib/cache.ts` → `createCacheNamespace`) are the single source of truth for the tag string. Each feature owns one: `itemsCache` in `features/learning-items/cache.ts`, `tagsCache` in `features/tags/cache.ts`. The namespace exposes `tagFor(userId)` for readers and `invalidate(userId)` for writers; both resolve to the same per-user string (`${key}:${userId}`) so they cannot drift.

Cascades are declared inline: `tagsCache.cascadesTo = [itemsCache]` because tag chips render on item rows. When a server action invalidates `tagsCache`, items get refreshed too; the rule lives next to the cache, not in the action. One-level only — cascades are not transitive.

Each cached page follows the shape:

```tsx
export default function Page() {
  return <Suspense fallback={<...>}><Loader /></Suspense>;
}
async function Loader() {                          // dynamic — reads cookies/params
  const user = await requireUser();
  return <Content userId={user.id} />;
}
async function Content({ userId }) {
  "use cache";
  cacheTag(itemsCache.tagFor(userId));             // declares dependency
  // ... fetch + JSX
}
```

Services (`features/<f>/service.ts`) are plain Prisma — no caching wrappers. Reads come only from cached page subtrees, never from actions. `cacheLife` is left at the Next default (15-min revalidate) as a safety net for future out-of-band writes.

The items page caches only the no-filter render path; any filter (including free-text `q`) renders dynamically to avoid cache-entry proliferation. Client navigation is kept warm by `experimental.staleTimes.dynamic: 30` — without it, every nav does an RSC roundtrip even on a server cache hit.

## Auth

BetterAuth + Prisma adapter, email/password. Sessions in DB. The `(app)` layout enforces `requireUser()`; the `(auth)` group renders sign-in/sign-up.

## Future extensibility hooks

- New item types → add enum value, ship.
- Roadmaps → new table referencing `LearningItem.id`; no schema churn elsewhere.
- AI features → new feature folder, consumes `service.ts` like any UI does.
- Analytics → new aggregate queries in `features/<feature>/service.ts`; no new tables initially.
