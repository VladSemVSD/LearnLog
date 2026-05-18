import { requireUser } from "@/features/auth/server";
import { listTags } from "@/features/tags/service";
import { TagsManager } from "@/features/tags/components/tags-manager";

export const metadata = { title: "Tags · Learning Portal" };

export default async function TagsPage() {
  const user = await requireUser();
  const tags = await listTags(user.id);
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
