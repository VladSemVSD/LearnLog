"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
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
import type { ItemSort } from "../schema";
import type { listItems } from "../service";
import type { listTags } from "@/features/tags/service";

type Item = Awaited<ReturnType<typeof listItems>>[number];
type Tag = Awaited<ReturnType<typeof listTags>>[number];

type SortableColumn = "title" | "priority" | "updated" | "completed";

function nextSortFor(column: SortableColumn, current: ItemSort): ItemSort {
  switch (column) {
    case "title":
      return "title-asc";
    case "completed":
      return "completed-desc";
    case "priority":
      return current === "priority-desc" ? "priority-asc" : "priority-desc";
    case "updated":
      return current === "updated-desc" ? "updated-asc" : "updated-desc";
  }
}

function activeDirection(
  column: SortableColumn,
  current: ItemSort,
): "asc" | "desc" | null {
  if (column === "title" && current === "title-asc") return "asc";
  if (column === "completed" && current === "completed-desc") return "desc";
  if (column === "priority") {
    if (current === "priority-desc") return "desc";
    if (current === "priority-asc") return "asc";
  }
  if (column === "updated") {
    if (current === "updated-desc") return "desc";
    if (current === "updated-asc") return "asc";
  }
  return null;
}

function buildSortHref(filterSearchString: string, sort: ItemSort): string {
  const params = new URLSearchParams(filterSearchString);
  params.set("sort", sort);
  return `/items?${params.toString()}`;
}

export function ItemsTable({
  items,
  tags,
  currentSort,
  filterSearchString,
}: {
  items: Item[];
  tags: Tag[];
  currentSort: ItemSort;
  filterSearchString: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editorRef = useRef<SaveStateProviderHandle>(null);

  // If the currently-expanded item disappears (delete, filter change), the
  // RowGroup for it stops rendering, the editor unmounts, and editorRef
  // clears to null. expandedId stays as a stale id in state but nothing
  // renders against it; the next user click overwrites it. No effect needed.

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
        <TableHeader className="bg-muted/50 [&_tr]:border-b-2">
          <TableRow className="hover:bg-muted/50">
            <TableHead>
              <SortHeader
                label="Title"
                column="title"
                currentSort={currentSort}
                filterSearchString={filterSearchString}
              />
            </TableHead>
            <TableHead className="w-32">Type</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-24">
              <SortHeader
                label="Priority"
                column="priority"
                currentSort={currentSort}
                filterSearchString={filterSearchString}
              />
            </TableHead>
            <TableHead className="w-40">Progress</TableHead>
            <TableHead className="w-32">
              <SortHeader
                label="Updated"
                column="updated"
                currentSort={currentSort}
                filterSearchString={filterSearchString}
              />
            </TableHead>
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
        <TableCell className="text-muted-foreground text-xs tabular-nums">
          {item.priority}
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
          <TableCell colSpan={7} className="p-4 sm:p-6">
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

function SortHeader({
  label,
  column,
  currentSort,
  filterSearchString,
}: {
  label: string;
  column: SortableColumn;
  currentSort: ItemSort;
  filterSearchString: string;
}) {
  const direction = activeDirection(column, currentSort);
  const href = buildSortHref(filterSearchString, nextSortFor(column, currentSort));
  return (
    <Link
      href={href}
      data-no-expand
      className="hover:text-foreground inline-flex items-center gap-1"
    >
      {label}
      {direction === "desc" ? <ArrowDown className="size-3" /> : null}
      {direction === "asc" ? <ArrowUp className="size-3" /> : null}
    </Link>
  );
}
