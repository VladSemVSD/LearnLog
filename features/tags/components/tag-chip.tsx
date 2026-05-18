import { cn } from "@/lib/utils";

export function TagChip({
  name,
  color,
  className,
  onRemove,
}: {
  name: string;
  color?: string | null;
  className?: string;
  onRemove?: () => void;
}) {
  const style = color
    ? {
        backgroundColor: `${color}1a`, // ~10% alpha
        borderColor: `${color}55`,
        color,
      }
    : undefined;

  return (
    <span
      className={cn(
        "border-border bg-muted text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={style}
    >
      {name}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-70"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
