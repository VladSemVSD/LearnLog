"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  attachTagAction,
  createTagAction,
  deleteTagAction,
  detachTagAction,
  updateTagAction,
} from "../server/actions";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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
    if (editingId === tagId) return;
    const isAttached = attachedSet.has(tagId);
    startTransition(async () => {
      const result = isAttached
        ? await detachTagAction({ itemId, tagId })
        : await attachTagAction({ itemId, tagId });
      if (!result.ok) toast.error(result.error);
    });
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const created = await createTagAction({
        name: trimmed,
        color: color || null,
      });
      if (!created.ok) {
        toast.error(created.error);
        return;
      }
      const attached = await attachTagAction({
        itemId,
        tagId: created.data.id,
      });
      if (!attached.ok) {
        toast.error(attached.error);
        return;
      }
      setName("");
      setColor("");
      toast.success(`Added "${created.data.name}"`);
    });
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

        <div className="flex gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Search or create…"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#color"
            className="w-24"
            aria-label="Tag color"
          />
        </div>

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
                  attached={attachedSet.has(tag.id)}
                  isEditing={editingId === tag.id}
                  someoneElseEditing={editingId !== null && editingId !== tag.id}
                  disabled={isPending}
                  onToggle={() => toggle(tag.id)}
                  onStartEdit={() => setEditingId(tag.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaved={() => setEditingId(null)}
                />
              ))}
            </ul>
          )}
        </div>

        {canCreate ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleCreate}
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TagRow({
  tag,
  attached,
  isEditing,
  someoneElseEditing,
  disabled,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaved,
}: {
  tag: PickerTag;
  attached: boolean;
  isEditing: boolean;
  someoneElseEditing: boolean;
  disabled: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
}) {
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!editName.trim()) return;
    startTransition(async () => {
      const result = await updateTagAction({
        id: tag.id,
        name: editName.trim(),
        color: editColor || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tag updated");
      onSaved();
    });
  }

  function cancel() {
    setEditName(tag.name);
    setEditColor(tag.color ?? "");
    onCancelEdit();
  }

  if (isEditing) {
    return (
      <li className="bg-muted/40 -mx-1 flex items-center gap-2 px-2 py-1.5">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-8 flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") cancel();
          }}
        />
        <Input
          value={editColor}
          onChange={(e) => setEditColor(e.target.value)}
          placeholder="#color"
          className="h-8 w-24"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={isPending || !editName.trim()}>
          {isPending ? "…" : "Save"}
        </Button>
      </li>
    );
  }

  return (
    <li className="group">
      <div
        className={cn(
          "hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          attached && "bg-muted/60",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || someoneElseEditing}
          className="flex flex-1 items-center justify-between"
        >
          <span className="flex items-center gap-2">
            {tag.color ? (
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            ) : (
              <span className="bg-muted-foreground/30 inline-block size-2.5 rounded-full" />
            )}
            {tag.name}
          </span>
          {attached ? <Check className="text-primary size-3.5" /> : null}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onStartEdit}
            disabled={someoneElseEditing}
            aria-label={`Rename ${tag.name}`}
          >
            <Pencil className="size-3" />
          </Button>
          <DeleteTagInline id={tag.id} name={tag.name} />
        </div>
      </div>
    </li>
  );
}

function DeleteTagInline({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteTagAction({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tag "${name}" deleted`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
            <Trash2 className="size-3" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tag &quot;{name}&quot;?</DialogTitle>
          <DialogDescription>
            Will detach from every item. Cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
