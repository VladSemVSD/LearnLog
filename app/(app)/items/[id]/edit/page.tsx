import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { getItem } from "@/features/learning-items/service";
import { ItemForm } from "@/features/learning-items/components/item-form";

export const metadata = { title: "Edit item · Learning Portal" };

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const item = await getItem(user.id, id);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit item</h1>
        <p className="text-muted-foreground text-sm">
          Update fields and save your changes.
        </p>
      </div>
      <div className="max-w-2xl">
        <ItemForm
          mode="edit"
          itemId={item.id}
          defaultValues={{
            title: item.title,
            description: item.description ?? "",
            type: item.type,
            status: item.status,
            priority: item.priority,
            progressPercent: item.progressPercent,
            estimatedHours: item.estimatedHours,
            actualHours: item.actualHours,
            sourceUrl: item.sourceUrl ?? "",
            notes: item.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
