"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ItemStatus } from "@/lib/generated/prisma/enums";
import {
  updateItemProgressAction,
  updateItemStatusAction,
} from "../../server/actions";
import { useSaveState } from "./save-state-context";
import { useAutosaveField } from "./use-autosave-field";

export function InlineProgress({
  itemId,
  initialValue,
}: {
  itemId: string;
  initialValue: number;
}) {
  const { markSaving, markSaved, markError } = useSaveState();
  const [, startTransition] = useTransition();

  // commitOn: 'manual' — slider commits on release only (mouseUp / touchEnd /
  // keyUp), not on every drag tick. Keeps lifecycle prompts firing exactly
  // once per gesture.
  const autosave = useAutosaveField<number>({
    initial: initialValue,
    commitOn: { on: "manual" },
    save: async (next) => {
      const result = await updateItemProgressAction({
        id: itemId,
        progressPercent: next,
      });
      if (result.ok) {
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
      }
      return result;
    },
    revertOnError: true,
  });

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={autosave.value}
        onChange={(e) => autosave.setValue(Number(e.target.value))}
        onMouseUp={() => void autosave.commit()}
        onTouchEnd={() => void autosave.commit()}
        onKeyUp={() => void autosave.commit()}
        className="accent-primary h-1 flex-1 cursor-pointer"
        aria-label="Progress percent"
      />
      <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
        {autosave.value}%
      </span>
    </div>
  );
}
