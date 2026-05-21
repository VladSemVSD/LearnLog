"use client";

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
import { useAutosaveField } from "./use-autosave-field";

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
  const autosave = useAutosaveField<ItemStatus>({
    initial: initialValue,
    commitOn: { on: "change" },
    save: (next) => updateItemStatusAction({ id: itemId, status: next }),
    revertOnError: true,
  });

  return (
    <Select
      value={autosave.value}
      onValueChange={(next: string | null) => {
        if (next === null) return;
        autosave.setValue(next as ItemStatus);
      }}
    >
      <SelectTrigger
        className={cn(
          "border-transparent bg-transparent shadow-none hover:bg-transparent",
          "h-auto w-auto gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
          STATUS_COLOR[autosave.value],
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
