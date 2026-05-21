"use client";

import { useSyncExternalStore } from "react";

const DAY_MS = 86_400_000;

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < DAY_MS) return "today";
  if (diffMs < DAY_MS * 2) return "yesterday";
  if (diffMs < DAY_MS * 30) return `${Math.floor(diffMs / DAY_MS)}d ago`;
  return date.toLocaleDateString();
}

// No external state to subscribe to — useSyncExternalStore's third arg
// (server snapshot) is what we actually want: it forces the SSR/initial-client
// render to use the absolute date, then post-hydration uses the relative form.
function noopSubscribe(): () => void {
  return () => {};
}

/**
 * Renders a date as a relative string ("today" / "5d ago"). SSR / initial
 * hydration use the absolute date so the cached RSC payload stays meaningful;
 * post-hydration uses the relative form.
 *
 * `useSyncExternalStore`'s two snapshot args give us the SSR / client
 * divergence without a `useEffect + setState` pattern (which triggers the
 * `react-hooks/set-state-in-effect` lint rule).
 */
export function RelativeTime({ iso }: { iso: string | Date }) {
  const date = iso instanceof Date ? iso : new Date(iso);
  const text = useSyncExternalStore(
    noopSubscribe,
    () => formatRelative(date),
    () => date.toLocaleDateString(),
  );
  return <span suppressHydrationWarning>{text}</span>;
}
