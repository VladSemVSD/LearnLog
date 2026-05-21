"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { STATUS_COLOR, STATUS_LABEL } from "../../constants";
import { updateItemStatusAction } from "../../server/actions";
import { useSaveState } from "./save-state-context";

const ORDER: ItemStatus[] = [
  ItemStatus.BACKLOG,
  ItemStatus.PLANNED,
  ItemStatus.IN_PROGRESS,
  ItemStatus.PAUSED,
  ItemStatus.COMPLETED,
  ItemStatus.DROPPED,
];

export function InlineStatus({
  itemId,
  initialValue,
}: {
  itemId: string;
  initialValue: ItemStatus;
}) {
  const [value, setValue] = useState<ItemStatus>(initialValue);
  const [, startTransition] = useTransition();
  const { markSaving, markSaved, markError, setLastAttempt } = useSaveState();

  function onChange(next: string | null) {
    if (next === null) return;
    const nextStatus = next as ItemStatus;
    if (nextStatus === value) return;
    setValue(nextStatus);

    const attempt = () =>
      new Promise<void>((resolve) => {
        startTransition(async () => {
          markSaving();
          const result = await updateItemStatusAction({
            id: itemId,
            status: nextStatus,
          });
          if (result.ok) {
            markSaved();
          } else {
            markError(result.error);
            setValue(value);
          }
          resolve();
        });
      });
    setLastAttempt(attempt);
    void attempt();
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "border-transparent bg-transparent shadow-none hover:bg-transparent",
          "h-auto w-auto gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
          STATUS_COLOR[value],
        )}
      >
        <SelectValue>
          {(v: string) =>
            v ? (
              <span className="inline-flex items-center gap-1">
                {STATUS_LABEL[v as ItemStatus]}
                <ChevronDown className="size-3" />
              </span>
            ) : (
              "Select status"
            )
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
