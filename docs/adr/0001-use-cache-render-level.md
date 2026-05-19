# Page-render caching via Next 16 `'use cache'`, surgical opt-in

## Status

Accepted (2026-05-19)

## Context

Phase 2 wired `unstable_cache` around every read service via the `lib/cache.ts` namespace module (`itemsCache.wrap`, `tagsCache.wrap`), tagged per user, invalidated by the action runner. This eliminated DB round-trips on cache hits — but pages still re-rendered on every navigation because each route is dynamic (every page calls `requireUser()`, which reads cookies). The visible symptom: `app/(app)/loading.tsx` flashing on every navigation in production once the 30s client Router Cache window expired. The cache layer in place was a *data* cache, not a *page-render* cache.

## Decision

Cache the rendered RSC subtree of each page, not just the DB results, using Next 16's `'use cache'` directive. In Next 16.2.6 the directive is gated by the `cacheComponents` config flag — that flag is on. With it enabled, the default rendering mode is static-by-default, so any dynamic data access (`requireUser()`, `await params`, `await searchParams`, `usePathname()` in client components) must sit inside a `<Suspense>` boundary. The Sidebar and Topbar in the `(app)` layout are each wrapped in their own Suspense; every cached page exposes a sync outer shell whose body is a single Suspense wrapping a `<Loader>` → `<Content>` chain. The cached component declares its dependencies with `cacheTag(...)` using the same per-user tag string the action runner invalidates via `updateTag`.

Concretely:
- `lib/cache.ts` exposes `tagFor(userId)` (used by pages) and `invalidate(userId)` (used by the action runner). The `wrap()` method is removed.
- `features/*/service.ts` reads are plain Prisma calls — no `unstable_cache` wrappers.
- `cacheLife` is left at the default (15-min revalidate) as a safety net for future out-of-band writes (Phase 5 AI features, possible webhooks).
- Cascade rules (`tagsCache` → `itemsCache`) remain encoded on the namespace and fire on the action runner side, unchanged.
- The items page caches only the no-filter render path; any filter (including free-text `q`) renders dynamically to avoid cache-entry proliferation.

## Considered alternatives

- **Keep `unstable_cache` as-is, raise `staleTimes.dynamic`.** Cheapest. Hides the symptom but not the cause — the RSC still re-renders on every server hit; only the client Router Cache stretches. Rejected: doesn't match the "don't re-fetch unless data changed" mental model.
- **Skip `cacheComponents` and add `"use cache"` directives only.** The shape we initially tried. Next 16.2.6 errors at build with "To use 'use cache', please enable the feature flag `cacheComponents`" — the flag is the gate. Not viable in this minor.
- **Keep both `unstable_cache` and `'use cache'` (defense in depth).** Both layers tag with the same string and invalidate together; the inner layer would never serve data the outer wouldn't have. Rejected as redundant work on every miss + two configs to keep in sync.

## Consequences

- A future reader sees `lib/cache.ts` with only `tagFor` and `invalidate` and no `wrap` — the file makes sense only with this ADR in hand. Pages and the runner must agree on the tag-string format; the namespace module is the single source of truth.
- The items page has two render paths (cached no-filter, dynamic filtered). A `loading.tsx` partial skeleton inside `app/(app)/items/` covers the dynamic case.
- Date-dependent rendering must move out of the cached subtree. `<RelativeTime />` is a client component; `getStaleItems` (which used `Date.now()` inside the cached path) was deleted and replaced with `getUpNextItems` (priority-ordered backlog).
- The shared `app/(app)/loading.tsx` is deleted. A `useLinkStatus()`-driven top-of-page progress bar in the app layout provides the global pending-navigation signal.
- If `'use cache'` semantics ever change (still labelled stable but evolving), the migration is reversible per-route: reintroduce `unstable_cache` wrappers in the relevant service calls and drop the `"use cache"` directive on the affected component.
