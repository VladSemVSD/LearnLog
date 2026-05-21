"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NotesEditor } from "./notes-editor";
import { updateItemFieldsAction } from "../server/actions";

export function NotesSection({
  itemId,
  initialNotes,
}: {
  itemId: string;
  initialNotes: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes);
  const [saved, setSaved] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateItemFieldsAction({
        id: itemId,
        patch: { notes: draft },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Notes saved");
      setSaved(draft);
      setEditing(false);
    });
  }

  function cancel() {
    setDraft(saved);
    setEditing(false);
  }

  return (
    <section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Notes</h2>
        {editing ? (
          <div className="flex items-center gap-1">
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
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
            {saved ? "Edit notes" : "Add notes"}
          </Button>
        )}
      </div>

      {editing ? (
        <NotesEditor
          value={draft}
          onChange={setDraft}
          disabled={isPending}
          placeholder="Write your notes…"
        />
      ) : saved ? (
        <div className="tiptap-content text-sm">
          <ReactMarkdown>{saved}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic">
          No notes yet. Click &quot;Add notes&quot; to start writing.
        </p>
      )}
    </section>
  );
}
