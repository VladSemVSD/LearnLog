import { ItemForm } from "@/features/learning-items/components/item-form";

export const metadata = { title: "New item · Learning Portal" };

export default function NewItemPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">New item</h1>
        <p className="text-muted-foreground text-sm">
          Add a project, course, book, video, or anything else you&apos;re
          learning.
        </p>
      </div>
      <div className="max-w-2xl">
        <ItemForm mode="create" />
      </div>
    </div>
  );
}
