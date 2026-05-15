import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "border-border bg-card flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="text-muted-foreground size-10" /> : null}
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
