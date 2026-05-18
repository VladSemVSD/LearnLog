import "server-only";

import { requireUser } from "@/features/auth/server";
import {
  countItemsByStatus,
  getItem,
  listItems,
} from "../service";
import type { ItemFilter } from "../schema";

export async function listItemsForUser(filter: ItemFilter = {}) {
  const user = await requireUser();
  return listItems(user.id, filter);
}

export async function getItemForUser(id: string) {
  const user = await requireUser();
  return getItem(user.id, id);
}

export async function statusCountsForUser() {
  const user = await requireUser();
  return countItemsByStatus(user.id);
}
