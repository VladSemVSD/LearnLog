import "server-only";

import { db } from "@/lib/db";
import type { ItemFilter } from "./schema";

export async function listItems(userId: string, _filter: ItemFilter = {}) {
  return db.learningItem.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { tags: { include: { tag: true } } },
  });
}

export async function countItemsByStatus(userId: string) {
  const rows = await db.learningItem.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}
