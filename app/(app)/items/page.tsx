import { Suspense } from "react";
import Link from "next/link";
import { cacheTag } from "next/cache";
import { ListTodo, Plus, SearchX } from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { listItems } from "@/features/learning-items/service";
import { listTags } from "@/features/tags/service";
import { itemsCache } from "@/features/learning-items/cache";
import { tagsCache } from "@/features/tags/cache";
import { itemFilterSchema } from "@/features/learning-items/schema";
import type { ItemFilter } from "@/features/learning-items/schema";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemsFilters } from "@/features/learning-items/components/items-filters";
import { ItemsTable } from "@/features/learning-items/components/items-table";
import ItemsLoading from "./loading";

export const metadata = { title: "Items · Learning Portal" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ItemsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<ItemsLoading />}>
      <ItemsLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function ItemsLoader({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const parsed = itemFilterSchema.safeParse({
    q: firstParam(sp.q),
    type: firstParam(sp.type),
    status: firstParam(sp.status),
    tagId: firstParam(sp.tag),
  });
  const filter: ItemFilter = parsed.success ? parsed.data : {};
  const hasFilters =
    Boolean(filter.q) ||
    Boolean(filter.type) ||
    Boolean(filter.status) ||
    Boolean(filter.tagId);

  const user = await requireUser();

  if (hasFilters) {
    return <ItemsContentFiltered userId={user.id} filter={filter} />;
  }
  return <ItemsContentEmpty userId={user.id} />;
}

async function ItemsContentEmpty({ userId }: { userId: string }) {
  "use cache";
  cacheTag(itemsCache.tagFor(userId));
  cacheTag(tagsCache.tagFor(userId));

  const [items, tags] = await Promise.all([listItems(userId, {}), listTags(userId)]);
  return <ItemsView items={items} tags={tags} hasFilters={false} />;
}

async function ItemsContentFiltered({
  userId,
  filter,
}: {
  userId: string;
  filter: ItemFilter;
}) {
  const [items, tags] = await Promise.all([
    listItems(userId, filter),
    listTags(userId),
  ]);
  return <ItemsView items={items} tags={tags} hasFilters={true} />;
}

type ItemViewRow = Awaited<ReturnType<typeof listItems>>[number];
type TagViewRow = Awaited<ReturnType<typeof listTags>>[number];

function ItemsView({
  items,
  tags,
  hasFilters,
}: {
  items: ItemViewRow[];
  tags: TagViewRow[];
  hasFilters: boolean;
}) {
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
        <ItemsTable items={items} tags={tags} />
      )}
    </div>
  );
}
