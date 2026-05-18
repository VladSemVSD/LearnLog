"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { Tag as TagIcon } from "lucide-react";
import {
  createTagAction,
  deleteTagAction,
  updateTagAction,
} from "../server/actions";

type Tag = { id: string; name: string; color: string | null };

export function TagsManager({ tags }: { tags: Tag[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <CreateTagDialog />
      </div>
      {tags.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="No tags yet"
          description="Tags help group items across types — e.g. 'python', 'work', 'side-project'."
        />
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TagRow({ tag }: { tag: Tag }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateTagAction({
        id: tag.id,
        name,
        color: color || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tag updated");
      setEditing(false);
    });
  }

  function cancel() {
    setName(tag.name);
    setColor(tag.color ?? "");
    setEditing(false);
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex flex-1 items-center gap-3">
        <span
          className="inline-block size-3 rounded-full"
          style={{ backgroundColor: tag.color ?? "var(--muted-foreground)" }}
        />
        {editing ? (
          <div className="flex flex-1 gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#aabbcc"
              className="max-w-32"
            />
          </div>
        ) : (
          <span className="font-medium">{tag.name}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(true)}
              aria-label="Rename tag"
            >
              <Pencil className="size-3.5" />
            </Button>
            <DeleteTagButton id={tag.id} name={tag.name} />
          </>
        )}
      </div>
    </li>
  );
}

function CreateTagDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createTagAction({
        name,
        color: color || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tag "${result.data.name}" created`);
      setName("");
      setColor("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New tag
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New tag</DialogTitle>
          <DialogDescription>
            Tags can be attached to any learning item.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., python"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Color (optional)</Label>
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#3b82f6"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTagButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteTagAction(id);
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
          <Button variant="ghost" size="icon-sm" aria-label="Delete tag">
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tag &quot;{name}&quot;?</DialogTitle>
          <DialogDescription>
            This will remove the tag from every item it&apos;s attached to.
            This cannot be undone.
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
