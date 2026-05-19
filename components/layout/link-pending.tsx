"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Renders a spinner while the enclosing `<Link>` is in flight. Must be a
 * descendant of the `<Link>` it observes — `useLinkStatus` is scoped to
 * the nearest `<Link>` ancestor.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className="ml-auto size-3.5 animate-spin" />;
}
