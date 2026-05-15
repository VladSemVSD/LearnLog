import "server-only";

import { requireUser } from "@/features/auth/server";
import { listItems, countItemsByStatus } from "../service";
import type { ItemFilter } from "../schema";

export async function listItemsForUser(filter: ItemFilter = {}) {
  const user = await requireUser();
  return listItems(user.id, filter);
}

export async function statusCountsForUser() {
  const user = await requireUser();
  return countItemsByStatus(user.id);
}
