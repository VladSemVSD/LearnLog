"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaveState } from "./save-state-context";

const TICK_MS = 15_000;

function formatSaveTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

export function AutosaveFooter() {
  const { state, retry } = useSaveState();
  const [, force] = useState(0);

  // Re-render every 15s when an idle save timestamp is on screen so the
  // relative-time string ticks without an explicit user action.
  useEffect(() => {
    if (state.kind !== "idle" || state.lastSavedAt === null) return;
    const id = setInterval(() => force((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [state]);

  if (state.kind === "saving") {
    return (
      <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3 animate-spin" />
        <span>Saving…</span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="text-destructive inline-flex items-center gap-2 text-xs">
        <AlertCircle className="size-3" />
        <span>Save failed: {state.message}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            void retry();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (state.lastSavedAt === null) {
    return null;
  }

  return (
    <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
      <Check className="size-3" />
      <span>Saved {formatSaveTime(state.lastSavedAt)}</span>
    </div>
  );
}
