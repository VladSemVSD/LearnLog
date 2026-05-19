"use client";

import { useEffect, useState } from "react";

const DAY_MS = 86_400_000;

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < DAY_MS) return "today";
  if (diffMs < DAY_MS * 2) return "yesterday";
  if (diffMs < DAY_MS * 30) return `${Math.floor(diffMs / DAY_MS)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Renders a date as a relative string ("today" / "5d ago"). The SSR path
 * emits the absolute date so the cached RSC payload stays meaningful and
 * doesn't go stale; the client swaps to the relative form on mount.
 *
 * Lives on the client because `formatRelative` reads `Date.now()`, which
 * would freeze if it ran inside a `"use cache"` subtree.
 */
export function RelativeTime({ iso }: { iso: string | Date }) {
  const date = iso instanceof Date ? iso : new Date(iso);
  const [text, setText] = useState(() => date.toLocaleDateString());

  useEffect(() => {
    setText(formatRelative(date));
  }, [date]);

  return <span suppressHydrationWarning>{text}</span>;
}
