"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ItemStatus } from "@/lib/generated/prisma/enums";
import {
  updateItemProgressAction,
  updateItemStatusAction,
} from "../../server/actions";
import { useSaveState } from "./save-state-context";

export function InlineProgress({
  itemId,
  initialValue,
}: {
  itemId: string;
  initialValue: number;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const [, startTransition] = useTransition();
  const { markSaving, markSaved, markError, setLastAttempt } = useSaveState();

  // Save on release only (mouseUp / touchEnd / keyUp). No debounce during drag.
  // Keeps lifecycle prompts firing exactly once per gesture.
  function commitIfDirty() {
    if (value === saved) return;
    const next = value;

    const attempt = () =>
      new Promise<void>((resolve) => {
        startTransition(async () => {
          markSaving();
          const result = await updateItemProgressAction({
            id: itemId,
            progressPercent: next,
          });
          if (!result.ok) {
            markError(result.error);
            setValue(saved);
            resolve();
            return;
          }
          setSaved(next);
          markSaved();

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
                    markSaving();
                    const res = await updateItemStatusAction({
                      id: itemId,
                      status: ItemStatus.COMPLETED,
                    });
                    if (!res.ok) {
                      markError(res.error);
                      return;
                    }
                    markSaved();
                    toast.success("Marked complete");
                  });
                },
              },
            });
          }
          resolve();
        });
      });
    setLastAttempt(attempt);
    void attempt();
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={commitIfDirty}
        onTouchEnd={commitIfDirty}
        onKeyUp={commitIfDirty}
        className="accent-primary h-1 flex-1 cursor-pointer"
        aria-label="Progress percent"
      />
      <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
        {value}%
      </span>
    </div>
  );
}
