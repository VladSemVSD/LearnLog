import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheTag } from "next/cache";
import { requireUser } from "@/features/auth/server";
import { getItem } from "@/features/learning-items/service";
import { listTags } from "@/features/tags/service";
import { itemsCache } from "@/features/learning-items/cache";
import { tagsCache } from "@/features/tags/cache";
import { ItemInlineEditor } from "@/features/learning-items/components/item-inline-editor";

export const metadata = { title: "Item · Learning Portal" };

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ItemDetailFallback />}>
      <ItemDetailLoader params={params} />
    </Suspense>
  );
}

async function ItemDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  return <ItemDetail userId={user.id} id={id} />;
}

async function ItemDetail({ userId, id }: { userId: string; id: string }) {
  "use cache";
  cacheTag(itemsCache.tagFor(userId));
  cacheTag(tagsCache.tagFor(userId));

  const [item, allTags] = await Promise.all([
    getItem(userId, id),
    listTags(userId),
  ]);
  if (!item) notFound();

  return (
    <ItemInlineEditor
      item={item}
      availableTags={allTags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      }))}
    />
  );
}

function ItemDetailFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
        <div className="bg-muted h-8 w-2/3 animate-pulse rounded" />
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-24 animate-pulse rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted h-10 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
