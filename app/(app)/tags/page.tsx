import { Suspense } from "react";
import { cacheTag } from "next/cache";
import { requireUser } from "@/features/auth/server";
import { listTags } from "@/features/tags/service";
import { tagsCache } from "@/features/tags/cache";
import { TagsManager } from "@/features/tags/components/tags-manager";

export const metadata = { title: "Tags · Learning Portal" };

export default function TagsPage() {
  return (
    <Suspense fallback={<TagsFallback />}>
      <TagsLoader />
    </Suspense>
  );
}

async function TagsLoader() {
  const user = await requireUser();
  return <TagsContent userId={user.id} />;
}

async function TagsContent({ userId }: { userId: string }) {
  "use cache";
  cacheTag(tagsCache.tagFor(userId));

  const tags = await listTags(userId);
  const plain = tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tags</h1>
        <p className="text-muted-foreground text-sm">
          Manage tags you can attach to learning items.
        </p>
      </div>
      <TagsManager tags={plain} />
    </div>
  );
}

function TagsFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="bg-muted h-7 w-20 animate-pulse rounded" />
        <div className="bg-muted h-4 w-72 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-40 animate-pulse rounded-lg" />
    </div>
  );
}
