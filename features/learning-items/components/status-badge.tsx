import type { ItemStatus } from "@/lib/generated/prisma/enums";
import { STATUS_COLOR, STATUS_LABEL } from "../constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        STATUS_COLOR[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
