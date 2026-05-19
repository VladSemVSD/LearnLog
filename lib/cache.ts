import "server-only";

import { updateTag } from "next/cache";

/**
 * Cache namespace — the single source of truth for the tag string that
 * identifies a logical group of cached reads + the rule for invalidating
 * them.
 *
 * Each feature defines one (e.g. `itemsCache`, `tagsCache`). Cached page
 * subtrees call `cacheTag(namespace.tagFor(userId))`; the action runner
 * calls `namespace.invalidate(userId)` after writes. Both resolve to the
 * same per-user string, so they cannot drift.
 *
 * Cross-namespace cascades are declared inline on the namespace itself
 * (e.g. `tagsCache.cascadesTo = [itemsCache]` because tag chips render on
 * item rows). One-level only, not transitive — keeps reasoning local and
 * prevents accidental loops.
 *
 * See docs/adr/0001-use-cache-render-level.md for the broader decision.
 */

export type CacheNamespace = {
  /** Stable tag prefix; do not change once data is in production caches. */
  readonly key: string;
  /** Returns the per-user tag string used by both readers and writers. */
  tagFor(userId: string): string;
  /** Invalidate this namespace for the user; cascades fire as well. */
  invalidate(userId: string): void;
};

type CreateOptions = {
  key: string;
  /** Other namespaces whose data is affected by writes here. One-level only. */
  cascadesTo?: readonly CacheNamespace[];
};

export function createCacheNamespace(opts: CreateOptions): CacheNamespace {
  const tagFor = (userId: string) => `${opts.key}:${userId}`;

  return {
    key: opts.key,
    tagFor,
    invalidate(userId) {
      updateTag(tagFor(userId));
      for (const cascade of opts.cascadesTo ?? []) {
        updateTag(cascade.tagFor(userId));
      }
    },
  };
}
