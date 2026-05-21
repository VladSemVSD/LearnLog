"use client";

import { useMemo, useState } from "react";
import { Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTagMutations } from "../use-tag-mutations";
import { ColorInput } from "./color-input";
import { TagRow } from "./tag-row";

export type PickerTag = {
  id: string;
  name: string;
  color: string | null;
};

export function TagPicker({
  itemId,
  availableTags,
  attachedIds,
}: {
  itemId: string;
  availableTags: PickerTag[];
  attachedIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const { attach, detach, createAndAttach, isPending } = useTagMutations();
  const attachedSet = useMemo(() => new Set(attachedIds), [attachedIds]);

  const filtered = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTags, name]);

  const exactMatch = useMemo(
    () =>
      availableTags.some(
        (t) => t.name.toLowerCase() === name.trim().toLowerCase(),
      ),
    [availableTags, name],
  );
  const canCreate = name.trim().length > 0 && !exactMatch;

  function toggle(tagId: string) {
    const isAttached = attachedSet.has(tagId);
    if (isAttached) {
      void detach({ itemId, tagId });
    } else {
      void attach({ itemId, tagId });
    }
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const result = await createAndAttach({
      itemId,
      name: trimmed,
      color: color || null,
    });
    if (result.ok) {
      setName("");
      setColor("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <TagIcon className="size-3.5" />
            Manage tags
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tags</DialogTitle>
          <DialogDescription>
            Click a tag to attach or detach. Type a new name to create one.
            Hover any tag to rename or delete.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Search or create…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) {
              e.preventDefault();
              void handleCreate();
            }
          }}
        />

        <div className="-mx-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 && !canCreate ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
              No tags yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  attachState={{
                    attached: attachedSet.has(tag.id),
                    onToggle: () => toggle(tag.id),
                    disabled: isPending,
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        {canCreate ? (
          <div className="flex flex-col gap-2">
            <ColorInput value={color} onChange={setColor} />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCreate()}
              disabled={isPending}
              className="w-full justify-start"
            >
              <Plus className="size-3.5" />
              Create &quot;{name.trim()}&quot;
              {color ? (
                <span
                  className="ml-2 inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ) : null}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
