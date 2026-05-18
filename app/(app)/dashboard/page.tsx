import Link from "next/link";
import { Clock, ListTodo, Plus, Sparkles, Trophy } from "lucide-react";
import {
  dashboardInProgressForUser,
  dashboardRecentCompletedForUser,
  dashboardStaleForUser,
  statusCountsForUser,
} from "@/features/learning-items/server/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/features/learning-items/components/status-badge";
import { ProgressBar } from "@/features/learning-items/components/progress-bar";
import {
  STATUS_LABEL,
  TYPE_LABEL,
} from "@/features/learning-items/constants";
import type { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";

export const metadata = { title: "Dashboard · Learning Portal" };

type ItemRow = {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  progressPercent: number;
  updatedAt: Date | string;
  completedAt: Date | string | null;
};

export default async function DashboardPage() {
  const [counts, inProgress, recent, stale] = await Promise.all([
    statusCountsForUser(),
    dashboardInProgressForUser(),
    dashboardRecentCompletedForUser(),
    dashboardStaleForUser(),
  ]);

  const total = counts.reduce((acc, c) => acc + c.count, 0);
  const map = new Map<ItemStatus, number>(counts.map((c) => [c.status, c.count]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            An overview of what you&apos;re learning.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/items/new" />}>
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
            <Button nativeButton={false} render={<Link href="/items/new" />}>
              <Plus className="size-4" />
              Add your first item
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((status) => (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {STATUS_LABEL[status]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {map.get(status) ?? 0}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ItemListCard
              icon={Sparkles}
              title="In progress"
              items={inProgress}
              emptyText="Nothing currently in progress."
              showProgress
            />
            <ItemListCard
              icon={Trophy}
              title="Recently completed"
              items={recent}
              emptyText="No items completed yet."
              dateField="completedAt"
            />
            <ItemListCard
              icon={Clock}
              title="Stale (14d+)"
              items={stale}
              emptyText="No stale items — nice."
              dateField="updatedAt"
            />
          </div>
        </>
      )}
    </div>
  );
}

function ItemListCard({
  icon: Icon,
  title,
  items,
  emptyText,
  showProgress,
  dateField,
}: {
  icon: typeof Sparkles;
  title: string;
  items: ItemRow[];
  emptyText: string;
  showProgress?: boolean;
  dateField?: "completedAt" | "updatedAt";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/items/${item.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {TYPE_LABEL[item.type]}
                  </span>
                </div>
                {showProgress ? (
                  <div className="flex items-center gap-2">
                    <ProgressBar value={item.progressPercent} />
                    <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                      {item.progressPercent}%
                    </span>
                  </div>
                ) : null}
                {dateField ? (
                  <span className="text-muted-foreground text-xs">
                    {dateField === "completedAt" && item.completedAt
                      ? `Completed ${formatRelative(item.completedAt)}`
                      : null}
                    {dateField === "updatedAt"
                      ? `Last touched ${formatRelative(item.updatedAt)}`
                      : null}
                  </span>
                ) : null}
                {!showProgress && !dateField ? (
                  <StatusBadge status={item.status} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelative(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diffMs < day) return "today";
  if (diffMs < day * 2) return "yesterday";
  if (diffMs < day * 30) return `${Math.floor(diffMs / day)}d ago`;
  return d.toLocaleDateString();
}
