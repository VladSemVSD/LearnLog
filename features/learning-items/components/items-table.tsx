"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeTime } from "@/components/shared/relative-time";
import { TagChip } from "@/features/tags/components/tag-chip";
import { cn } from "@/lib/utils";
import { ItemInlineEditor } from "./item-inline-editor";
import type { SaveStateProviderHandle } from "./item-inline-editor/save-state-context";
import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";
import { TYPE_LABEL } from "../constants";
import type { listItems } from "../service";
import type { listTags } from "@/features/tags/service";

type Item = Awaited<ReturnType<typeof listItems>>[number];
type Tag = Awaited<ReturnType<typeof listTags>>[number];

export function ItemsTable({
  items,
  tags,
}: {
  items: Item[];
  tags: Tag[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editorRef = useRef<SaveStateProviderHandle>(null);

  // If the currently-expanded item disappears (delete, filter change), collapse.
  useEffect(() => {
    if (expandedId && !items.some((i) => i.id === expandedId)) {
      setExpandedId(null);
    }
  }, [items, expandedId]);

  async function toggle(id: string) {
    // Flush any dirty debounce buffers in the currently-expanded editor before
    // it unmounts, so half-typed text commits instead of getting discarded.
    if (expandedId) {
      try {
        await editorRef.current?.flushAll();
      } catch {
        // Surfaced via the editor's save-state footer; keep the row expanded.
        return;
      }
    }
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const availableTags = tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="w-32">Type</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-40">Progress</TableHead>
            <TableHead className="w-32">Updated</TableHead>
            <TableHead className="w-10" aria-label="Open detail" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isExpanded = item.id === expandedId;
            return (
              <RowGroup
                key={item.id}
                item={item}
                isExpanded={isExpanded}
                onToggle={() => void toggle(item.id)}
                editorRef={isExpanded ? editorRef : undefined}
                availableTags={availableTags}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RowGroup({
  item,
  isExpanded,
  onToggle,
  editorRef,
  availableTags,
}: {
  item: Item;
  isExpanded: boolean;
  onToggle: () => void;
  editorRef: React.Ref<SaveStateProviderHandle> | undefined;
  availableTags: { id: string; name: string; color: string | null }[];
}) {
  function onClickRow(e: React.MouseEvent<HTMLTableRowElement>) {
    // Don't toggle when the user clicks inside an interactive child.
    const target = e.target as HTMLElement;
    if (target.closest("a, button, [data-no-expand]")) return;
    onToggle();
  }

  return (
    <>
      <TableRow
        className={cn(
          "group cursor-pointer",
          isExpanded && "bg-accent/40",
        )}
        onClick={onClickRow}
      >
        <TableCell>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{item.title}</span>
            {item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {item.tags.map(({ tag }) => (
                  <TagChip key={tag.id} name={tag.name} color={tag.color} />
                ))}
              </div>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
          {TYPE_LABEL[item.type]}
        </TableCell>
        <TableCell>
          <StatusBadge status={item.status} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <ProgressBar value={item.progressPercent} />
            <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
              {item.progressPercent}%
            </span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
          <RelativeTime iso={item.updatedAt} />
        </TableCell>
        <TableCell className="text-right">
          <Link
            href={`/items/${item.id}`}
            aria-label="Open item detail"
            className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100"
          >
            <ExternalLink className="size-3.5" />
          </Link>
        </TableCell>
      </TableRow>
      {isExpanded ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="p-4 sm:p-6">
            <ItemInlineEditor
              item={item}
              availableTags={availableTags}
              ref={editorRef}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
