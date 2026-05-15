import Link from "next/link";
import { ListTodo, Plus } from "lucide-react";
import { listItemsForUser } from "@/features/learning-items/server/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/features/learning-items/components/status-badge";
import { TYPE_LABEL } from "@/features/learning-items/constants";

export const metadata = { title: "Items · Learning Portal" };

export default async function ItemsPage() {
  const items = await listItemsForUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Items</h1>
          <p className="text-muted-foreground text-sm">Everything you&apos;re tracking.</p>
        </div>
        <Button render={<Link href="/items/new" />}>
          <Plus className="size-4" />
          New item
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No items yet"
          description="Items you add will appear here."
          action={
            <Button render={<Link href="/items/new" />}>
              <Plus className="size-4" />
              Add your first item
            </Button>
          }
        />
      ) : (
        <ul className="border-border divide-border bg-card divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Link href={`/items/${item.id}`} className="font-medium hover:underline">
                  {item.title}
                </Link>
                <span className="text-muted-foreground text-xs">{TYPE_LABEL[item.type]}</span>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
