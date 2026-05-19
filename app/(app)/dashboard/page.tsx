import { Suspense } from "react";
import Link from "next/link";
import { cacheTag } from "next/cache";
import { Compass, ListTodo, Plus, Sparkles, Trophy } from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { itemsCache } from "@/features/learning-items/cache";
import {
  countItemsByStatus,
  getInProgressItems,
  getRecentlyCompleted,
  getUpNextItems,
} from "@/features/learning-items/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { RelativeTime } from "@/components/shared/relative-time";
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
  priority: number;
  updatedAt: Date | string;
  completedAt: Date | string | null;
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardLoader />
    </Suspense>
  );
}

async function DashboardLoader() {
  const user = await requireUser();
  return <DashboardContent userId={user.id} />;
}

async function DashboardContent({ userId }: { userId: string }) {
  "use cache";
  cacheTag(itemsCache.tagFor(userId));

  const [counts, inProgress, recent, upNext] = await Promise.all([
    countItemsByStatus(userId),
    getInProgressItems(userId),
    getRecentlyCompleted(userId),
    getUpNextItems(userId),
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
              icon={Compass}
              title="Up next"
              items={upNext}
              emptyText="Backlog is empty."
              showPriority
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
  showPriority,
  dateField,
}: {
  icon: typeof Sparkles;
  title: string;
  items: ItemRow[];
  emptyText: string;
  showProgress?: boolean;
  showPriority?: boolean;
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
                {showPriority ? (
                  <span className="text-muted-foreground text-xs">
                    Priority {item.priority}
                  </span>
                ) : null}
                {dateField === "completedAt" && item.completedAt ? (
                  <span className="text-muted-foreground text-xs">
                    Completed <RelativeTime iso={item.completedAt} />
                  </span>
                ) : null}
                {dateField === "updatedAt" ? (
                  <span className="text-muted-foreground text-xs">
                    Last touched <RelativeTime iso={item.updatedAt} />
                  </span>
                ) : null}
                {!showProgress && !showPriority && !dateField ? (
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

function DashboardFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-7 w-40 animate-pulse rounded" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-9 w-28 animate-pulse rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-card h-24 animate-pulse rounded-lg border"
          />
        ))}
      </div>
    </div>
  );
}
