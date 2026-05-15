import Link from "next/link";
import { ListTodo, Plus } from "lucide-react";
import { statusCountsForUser } from "@/features/learning-items/server/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { STATUS_LABEL } from "@/features/learning-items/constants";
import type { ItemStatus } from "@/lib/generated/prisma/client";

export const metadata = { title: "Dashboard · Learning Portal" };

export default async function DashboardPage() {
  const counts = await statusCountsForUser();
  const total = counts.reduce((acc, c) => acc + c.count, 0);
  const map = new Map<ItemStatus, number>(counts.map((c) => [c.status, c.count]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">An overview of what you&apos;re learning.</p>
        </div>
        <Button render={<Link href="/items/new" />}>
          <Plus className="size-4" />
          New item
        </Button>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No learning items yet"
          description="Add your first project, course, book, or video to start tracking."
          action={
            <Button render={<Link href="/items/new" />}>
              <Plus className="size-4" />
              Add your first item
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((status) => (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {STATUS_LABEL[status]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{map.get(status) ?? 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
