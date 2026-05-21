"use client";

import { useState } from "react";
import { Plus, Tag as TagIcon } from "lucide-react";
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
import { useTagMutations } from "../use-tag-mutations";
import { ColorInput } from "./color-input";
import { TagRow } from "./tag-row";

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

function CreateTagDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const { create, isPending } = useTagMutations();

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const result = await create({ name: trimmed, color: color || null });
    if (result.ok) {
      setName("");
      setColor("");
      setOpen(false);
    }
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
                  void submit();
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Color (optional)</Label>
            <ColorInput value={color} onChange={setColor} />
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
          <Button
            onClick={() => void submit()}
            disabled={isPending || !name.trim()}
          >
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
