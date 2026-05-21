"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { useTagMutations } from "../use-tag-mutations";

export function DeleteTagDialog({
  id,
  name,
  triggerSize = "icon-sm",
}: {
  id: string;
  name: string;
  triggerSize?: "icon-sm" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const { remove, isPending } = useTagMutations();

  async function confirm() {
    const result = await remove({ id, name });
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size={triggerSize}
            aria-label={`Delete ${name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tag &quot;{name}&quot;?</DialogTitle>
          <DialogDescription>
            Will detach from every item it&apos;s attached to. Cannot be undone.
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
