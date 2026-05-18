import Link from "next/link";
import { ListTodo, Plus } from "lucide-react";
import { listItemsForUser } from "@/features/learning-items/server/queries";
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
import { TYPE_LABEL } from "@/features/learning-items/constants";

export const metadata = { title: "Items · Learning Portal" };

export default async function ItemsPage() {
  const items = await listItemsForUser();

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

      {items.length === 0 ? (
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
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/items/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
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

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const day = 86_400_000;
  if (diffMs < day) return "Today";
  if (diffMs < day * 2) return "Yesterday";
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d ago`;
  return date.toLocaleDateString();
}
