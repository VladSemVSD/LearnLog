import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { getItem } from "@/features/learning-items/service";
import { listTags } from "@/features/tags/service";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/learning-items/components/status-badge";
import { DeleteItemButton } from "@/features/learning-items/components/delete-item-button";
import { NotesSection } from "@/features/learning-items/components/notes-section";
import { ProgressSlider } from "@/features/learning-items/components/progress-slider";
import { TagChip } from "@/features/tags/components/tag-chip";
import { TagPicker } from "@/features/tags/components/tag-picker";
import {
  TYPE_LABEL,
  TYPE_ICON,
} from "@/features/learning-items/constants";

export const metadata = { title: "Item · Learning Portal" };

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [item, allTags] = await Promise.all([
    getItem(user.id, id),
    listTags(user.id),
  ]);
  if (!item) notFound();

  const TypeIcon = TYPE_ICON[item.type];
  const attachedTags = item.tags.map((t) => t.tag);
  const attachedIds = attachedTags.map((t) => t.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <TypeIcon className="size-3.5" />
            {TYPE_LABEL[item.type]}
          </div>
          <h1 className="text-2xl font-semibold leading-tight">{item.title}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="text-muted-foreground text-xs">
              Priority {item.priority}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/items/${item.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <DeleteItemButton itemId={item.id} />
        </div>
      </div>

      {item.description ? (
        <p className="text-muted-foreground whitespace-pre-wrap text-sm">
          {item.description}
        </p>
      ) : null}

      <section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Progress</h2>
        <ProgressSlider
          itemId={item.id}
          initialProgress={item.progressPercent}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Metadata label="Type" value={TYPE_LABEL[item.type]} />
        <Metadata label="Status" value={<StatusBadge status={item.status} />} />
        <Metadata label="Priority" value={String(item.priority)} />
        <Metadata
          label="Estimated hours"
          value={item.estimatedHours ?? "—"}
        />
        <Metadata
          label="Started"
          value={item.startedAt ? formatDate(item.startedAt) : "—"}
        />
        <Metadata
          label="Completed"
          value={item.completedAt ? formatDate(item.completedAt) : "—"}
        />
      </section>

      {item.sourceUrl ? (
        <div>
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ExternalLink className="size-3.5" />
            Open source
          </a>
        </div>
      ) : null}

      <section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Tags</h2>
          <TagPicker
            itemId={item.id}
            availableTags={allTags.map((t) => ({
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
    </div>
  );
}

function formatDate(value: Date | string): string {
  // unstable_cache serializes Date as a string; coerce defensively.
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString();
}

function Metadata({
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
