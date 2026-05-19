"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  updateItemProgressAction,
  updateItemStatusAction,
} from "../server/actions";

export function ProgressSlider({
  itemId,
  initialProgress,
}: {
  itemId: string;
  initialProgress: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialProgress);
  const [saved, setSaved] = useState(initialProgress);
  const [isPending, startTransition] = useTransition();

  const dirty = draft !== saved;

  function commit() {
    startTransition(async () => {
      const result = await updateItemProgressAction({
        id: itemId,
        progressPercent: draft,
      });
      if (!result.ok) {
        toast.error(result.error);
        setDraft(saved);
        return;
      }
      setSaved(draft);
      router.refresh();

      if (result.data.autoStarted) {
        toast.success("Status moved to In progress");
      }

      if (result.data.shouldPromptComplete) {
        toast("Mark as complete?", {
          description: "You've reached 100%. Set status to COMPLETED?",
          action: {
            label: "Mark complete",
            onClick: () => {
              startTransition(async () => {
                const res = await updateItemStatusAction({
                  id: itemId,
                  status: "COMPLETED",
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Marked complete");
                router.refresh();
              });
            },
          },
        });
      }
    });
  }

  function reset() {
    setDraft(saved);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
          disabled={isPending}
          className="accent-primary h-1 flex-1 cursor-pointer"
          aria-label="Progress percent"
        />
        <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
          {draft}%
        </span>
      </div>

      {dirty ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button size="sm" onClick={commit} disabled={isPending}>
            {isPending ? "Saving…" : "Save progress"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
