"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
] as const;

const PICKER_FALLBACK = "#3b82f6";

/**
 * Visual color picker for tags. Renders a row of preset swatches plus a
 * native <input type="color"> for fine-grained choices; an X clears the value
 * back to "no color".
 *
 * Stored value is either a 6-digit hex (e.g. "#3b82f6") or "" for no color.
 * The schema (features/tags/schema.ts) normalizes "" to null on the server.
 */
export function ColorInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const lower = value.toLowerCase();
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={cn(
            "size-5 cursor-pointer rounded-full transition-shadow",
            lower === c
              ? "ring-foreground ring-2 ring-offset-1"
              : "hover:ring-muted-foreground/40 hover:ring-1 hover:ring-offset-1",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <div className="bg-border mx-0.5 h-5 w-px" />
      <label
        className="border-muted-foreground/40 inline-flex size-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed"
        aria-label="Custom color"
        title="Custom color"
      >
        <input
          type="color"
          value={value || PICKER_FALLBACK}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 -translate-x-1 -translate-y-1 cursor-pointer appearance-none p-0"
        />
      </label>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear color"
          className="text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center rounded-md"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
