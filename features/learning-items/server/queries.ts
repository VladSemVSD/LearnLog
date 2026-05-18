import "server-only";

import { requireUser } from "@/features/auth/server";
import {
  countItemsByStatus,
  getInProgressItems,
  getItem,
  getRecentlyCompleted,
  getStaleItems,
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

export async function dashboardInProgressForUser() {
  const user = await requireUser();
  return getInProgressItems(user.id);
}

export async function dashboardRecentCompletedForUser() {
  const user = await requireUser();
  return getRecentlyCompleted(user.id);
}

export async function dashboardStaleForUser() {
  const user = await requireUser();
  return getStaleItems(user.id);
}
