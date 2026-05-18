import Link from "next/link";
import { ListTodo, Plus, SearchX } from "lucide-react";
import { listItemsForUser } from "@/features/learning-items/server/queries";
import { listTagsForUser } from "@/features/tags/server/queries";
import { itemFilterSchema } from "@/features/learning-items/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/features/learning-items/components/status-badge";
import { ProgressBar } from "@/features/learning-items/components/progress-bar";
import { ItemsFilters } from "@/features/learning-items/components/items-filters";
import { TagChip } from "@/features/tags/components/tag-chip";
import { TYPE_LABEL } from "@/features/learning-items/constants";

export const metadata = { title: "Items · Learning Portal" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const parsed = itemFilterSchema.safeParse({
    q: firstParam(sp.q),
    type: firstParam(sp.type),
    status: firstParam(sp.status),
    tagId: firstParam(sp.tag),
  });
  const filter = parsed.success ? parsed.data : {};
  const hasFilters =
    Boolean(filter.q) ||
    Boolean(filter.type) ||
    Boolean(filter.status) ||
    Boolean(filter.tagId);

  const [items, tags] = await Promise.all([
    listItemsForUser(filter),
    listTagsForUser(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Items</h1>
          <p className="text-muted-foreground text-sm">
            Everything you&apos;re tracking.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/items/new" />}>
          <Plus className="size-4" />
          New item
        </Button>
      </div>

      <ItemsFilters
        availableTags={tags.map((t) => ({ id: t.id, name: t.name }))}
      />

      {items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No items match these filters"
            description="Try clearing one or more filters."
          />
        ) : (
          <EmptyState
            icon={ListTodo}
            title="No items yet"
            description="Items you add will appear here."
            action={
              <Button nativeButton={false} render={<Link href="/items/new" />}>
                <Plus className="size-4" />
                Add your first item
              </Button>
            }
          />
        )
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Progress</TableHead>
                <TableHead className="w-32">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="relative cursor-pointer">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/items/${item.id}`}
                        className="font-medium before:absolute before:inset-0 before:content-['']"
                      >
                        {item.title}
                      </Link>
                      {item.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map(({ tag }) => (
                            <TagChip
                              key={tag.id}
                              name={tag.name}
                              color={tag.color}
                            />
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
                    {formatRelative(item.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function formatRelative(date: Date | string): string {
  // unstable_cache serializes Date as a string; coerce defensively.
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diffMs < day) return "Today";
  if (diffMs < day * 2) return "Yesterday";
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d ago`;
  return d.toLocaleDateString();
}
