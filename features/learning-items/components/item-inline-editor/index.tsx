"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";
import { Label } from "@/components/ui/label";
import { TagChip } from "@/features/tags/components/tag-chip";
import { TagPicker } from "@/features/tags/components/tag-picker";
import { DeleteItemButton } from "../delete-item-button";
import { NotesSection } from "../notes-section";
import { TYPE_ICON, TYPE_LABEL } from "../../constants";
import { AutosaveFooter } from "./autosave-footer";
import { InlineNumber } from "./inline-number";
import { InlineProgress } from "./inline-progress";
import { InlineSelect } from "./inline-select";
import { InlineStatus } from "./inline-status";
import { InlineText } from "./inline-text";
import {
  SaveStateProvider,
  type SaveStateProviderHandle,
} from "./save-state-context";

const TYPE_OPTIONS: { value: string; label: string }[] = (
  Object.keys(TYPE_LABEL) as ItemType[]
).map((t) => ({ value: t, label: TYPE_LABEL[t] }));

const PRIORITY_OPTIONS = [
  { value: "0", label: "0 — None" },
  { value: "1", label: "1 — Low" },
  { value: "2", label: "2 — Medium" },
  { value: "3", label: "3 — High" },
];

type TagRef = { id: string; name: string; color: string | null };

type ItemForEditor = {
  id: string;
  title: string;
  description: string | null;
  type: ItemType;
  status: ItemStatus;
  priority: number;
  progressPercent: number;
  estimatedHours: number | null;
  sourceUrl: string | null;
  notes: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  tags: { tag: TagRef }[];
};

export function ItemInlineEditor({
  item,
  availableTags,
  ref,
  showDelete = true,
}: {
  item: ItemForEditor;
  availableTags: TagRef[];
  ref?: React.Ref<SaveStateProviderHandle>;
  showDelete?: boolean;
}) {
  const TypeIcon = TYPE_ICON[item.type];
  const attachedTags = item.tags.map((t) => t.tag);
  const attachedIds = attachedTags.map((t) => t.id);

  return (
    <SaveStateProvider ref={ref}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TypeIcon className="size-3.5" />
              {TYPE_LABEL[item.type]}
            </div>
            <InlineText
              itemId={item.id}
              field="title"
              initialValue={item.title}
              placeholder="Untitled"
              className="text-lg font-semibold"
            />
            <div className="flex flex-wrap items-center gap-2">
              <InlineStatus itemId={item.id} initialValue={item.status} />
              <span className="text-muted-foreground text-xs">Priority</span>
              <InlineSelect
                itemId={item.id}
                initialValue={String(item.priority)}
                options={PRIORITY_OPTIONS}
                buildPatch={(raw) => ({ priority: Number(raw) })}
                triggerClassName="h-7 w-auto text-xs"
              />
            </div>
          </div>
          {showDelete ? (
            <div className="flex items-center gap-2">
              <DeleteItemButton itemId={item.id} />
            </div>
          ) : null}
        </div>

        <FieldRow label="Description">
          <InlineText
            itemId={item.id}
            field="description"
            initialValue={item.description ?? ""}
            placeholder="Add a description…"
            multiline
            nullableEmpty
          />
        </FieldRow>

        <section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium">Progress</h2>
          <InlineProgress
            itemId={item.id}
            initialValue={item.progressPercent}
          />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label="Type">
            <InlineSelect
              itemId={item.id}
              initialValue={item.type}
              options={TYPE_OPTIONS}
              buildPatch={(raw) => ({ type: raw as ItemType })}
            />
          </FieldRow>
          <FieldRow label="Estimated hours">
            <InlineNumber
              itemId={item.id}
              field="estimatedHours"
              initialValue={item.estimatedHours}
              min={0}
              step={0.5}
              placeholder="—"
            />
          </FieldRow>
          <ReadOnlyRow
            label="Started"
            value={item.startedAt ? formatDate(item.startedAt) : "—"}
          />
          <ReadOnlyRow
            label="Completed"
            value={item.completedAt ? formatDate(item.completedAt) : "—"}
          />
        </div>

        <FieldRow label="Source URL">
          <div className="flex items-center gap-2">
            <InlineText
              itemId={item.id}
              field="sourceUrl"
              initialValue={item.sourceUrl ?? ""}
              inputType="url"
              placeholder="https://…"
              nullableEmpty
              className="flex-1"
            />
            {item.sourceUrl ? (
              <Link
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
                aria-label="Open source URL"
              >
                <ExternalLink className="size-4" />
              </Link>
            ) : null}
          </div>
        </FieldRow>

        <section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Tags</h2>
            <TagPicker
              itemId={item.id}
              availableTags={availableTags.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
              }))}
              attachedIds={attachedIds}
            />
          </div>
          {attachedTags.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">
              No tags attached.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {attachedTags.map((tag) => (
                <TagChip key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          )}
        </section>

        <NotesSection itemId={item.id} initialNotes={item.notes ?? ""} />

        <div className="flex justify-end pt-2">
          <AutosaveFooter />
        </div>
      </div>
    </SaveStateProvider>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString();
}
