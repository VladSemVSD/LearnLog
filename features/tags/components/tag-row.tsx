"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTagMutations } from "../use-tag-mutations";
import { ColorInput } from "./color-input";
import { DeleteTagDialog } from "./delete-tag-dialog";

type Tag = { id: string; name: string; color: string | null };

type AttachState = {
  attached: boolean;
  onToggle: () => void;
  disabled: boolean;
};

export function TagRow({
  tag,
  attachState,
}: {
  tag: Tag;
  // When provided -> "picker" affordance: row is a click-to-toggle attach
  // button with hover-revealed edit/delete. Absent -> "manager" affordance:
  // static row with always-visible edit/delete.
  attachState?: AttachState;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color ?? "");
  const { rename, isPending } = useTagMutations();

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const result = await rename({
      id: tag.id,
      name: trimmed,
      color: color || null,
    });
    if (result.ok) setEditing(false);
  }

  function cancel() {
    setName(tag.name);
    setColor(tag.color ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <li
        className={
          attachState
            ? "bg-muted/40 -mx-1 flex flex-col gap-2 rounded-md px-2 py-2"
            : "flex flex-col gap-2 px-4 py-3"
        }
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") cancel();
          }}
        />
        <ColorInput value={color} onChange={setColor} />
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={cancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={isPending || !name.trim()}
          >
            {isPending ? "…" : "Save"}
          </Button>
        </div>
      </li>
    );
  }

  if (attachState) {
    return (
      <li className="group">
        <div
          className={cn(
            "hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            attachState.attached && "bg-muted/60",
          )}
        >
          <button
            type="button"
            onClick={attachState.onToggle}
            disabled={attachState.disabled}
            className="flex flex-1 items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <ColorDot color={tag.color} />
              {tag.name}
            </span>
            {attachState.attached ? (
              <Check className="text-primary size-3.5" />
            ) : null}
          </button>
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(true)}
              aria-label={`Rename ${tag.name}`}
            >
              <Pencil className="size-3" />
            </Button>
            <DeleteTagDialog id={tag.id} name={tag.name} />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex flex-1 items-center gap-3">
        <ColorDot color={tag.color} size="md" />
        <span className="font-medium">{tag.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          aria-label="Rename tag"
        >
          <Pencil className="size-3.5" />
        </Button>
        <DeleteTagDialog id={tag.id} name={tag.name} />
      </div>
    </li>
  );
}

function ColorDot({
  color,
  size = "sm",
}: {
  color: string | null;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "size-3" : "size-2.5";
  if (color) {
    return (
      <span
        className={cn("inline-block rounded-full", sizeClass)}
        style={{ backgroundColor: color }}
      />
    );
  }
  return (
    <span
      className={cn(
        "bg-muted-foreground/30 inline-block rounded-full",
        sizeClass,
      )}
    />
  );
}
