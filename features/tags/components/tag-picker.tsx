"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import {
  attachTagAction,
  createTagAction,
  detachTagAction,
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
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const attachedSet = useMemo(() => new Set(attachedIds), [attachedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTags, query]);

  const exactMatch = useMemo(
    () =>
      availableTags.some(
        (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
      ),
    [availableTags, query],
  );
  const canCreate = query.trim().length > 0 && !exactMatch;

  function toggle(tagId: string) {
    const isAttached = attachedSet.has(tagId);
    startTransition(async () => {
      const result = isAttached
        ? await detachTagAction({ itemId, tagId })
        : await attachTagAction({ itemId, tagId });
      if (!result.ok) toast.error(result.error);
    });
  }

  function handleCreate() {
    const name = query.trim();
    if (!name) return;
    startTransition(async () => {
      const created = await createTagAction({ name });
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
      setQuery("");
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
            Click a tag to attach or detach it. Type a new name to create one.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or create a tag…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) {
              e.preventDefault();
              handleCreate();
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
              {filtered.map((tag) => {
                const attached = attachedSet.has(tag.id);
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => toggle(tag.id)}
                      disabled={isPending}
                      className={cn(
                        "hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                        attached && "bg-muted/60",
                      )}
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
                      {attached ? (
                        <Check className="text-primary size-3.5" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
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
            Create &quot;{query.trim()}&quot;
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
