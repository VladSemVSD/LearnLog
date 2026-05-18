import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { ItemStatus, type ItemType } from "@/lib/generated/prisma/client";
import type {
  CreateItemInput,
  ItemFilter,
  UpdateItemInput,
} from "./schema";

const ONE_HOUR = 3600;

function itemsTag(userId: string) {
  return `items:${userId}`;
}

function buildWhere(userId: string, f: ItemFilter) {
  return {
    userId,
    ...(f.type ? { type: f.type } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.tagId ? { tags: { some: { tagId: f.tagId } } } : {}),
    ...(f.q ? { title: { contains: f.q, mode: "insensitive" as const } } : {}),
  };
}

const includeTags = { tags: { include: { tag: true } } } as const;

export function listItems(userId: string, filter: ItemFilter = {}) {
  return unstable_cache(
    async () =>
      db.learningItem.findMany({
        where: buildWhere(userId, filter),
        orderBy: { updatedAt: "desc" },
        include: includeTags,
      }),
    ["items", userId, JSON.stringify(filter)],
    { tags: [itemsTag(userId)], revalidate: ONE_HOUR },
  )();
}

export function getItem(userId: string, id: string) {
  return unstable_cache(
    async () =>
      db.learningItem.findFirst({
        where: { id, userId },
        include: includeTags,
      }),
    ["item", userId, id],
    { tags: [itemsTag(userId)], revalidate: ONE_HOUR },
  )();
}

export function countItemsByStatus(userId: string) {
  return unstable_cache(
    async () => {
      const rows = await db.learningItem.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
      });
      return rows.map((r) => ({ status: r.status, count: r._count._all }));
    },
    ["item-counts", userId],
    { tags: [itemsTag(userId)], revalidate: ONE_HOUR },
  )();
}

type CreateData = Omit<CreateItemInput, "tagIds" | "sourceUrl"> & {
  sourceUrl?: string | null;
};

function normalizeForWrite(input: Partial<CreateItemInput>) {
  // Treat empty-string URLs from form inputs as null.
  const sourceUrl =
    input.sourceUrl === undefined
      ? undefined
      : input.sourceUrl === "" || input.sourceUrl === null
        ? null
        : input.sourceUrl;
  return { ...input, sourceUrl };
}

export async function createItem(userId: string, input: CreateItemInput) {
  const data = normalizeForWrite(input) as CreateData & {
    title: string;
    type: ItemType;
  };
  return db.learningItem.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      status: data.status ?? ItemStatus.BACKLOG,
      priority: data.priority ?? 0,
      progressPercent: data.progressPercent ?? 0,
      estimatedHours: data.estimatedHours ?? null,
      actualHours: data.actualHours ?? null,
      sourceUrl: data.sourceUrl ?? null,
      notes: data.notes ?? null,
      startedAt:
        (data.status ?? ItemStatus.BACKLOG) === ItemStatus.IN_PROGRESS
          ? new Date()
          : null,
    },
  });
}

export async function updateItem(userId: string, input: UpdateItemInput) {
  const { id, tagIds, ...rest } = input;
  void tagIds; // Tag attachment lives in the tags service (Commit 2).
  const data = normalizeForWrite(rest);
  const existing = await db.learningItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  return db.learningItem.update({
    where: { id },
    data,
  });
}

export async function deleteItem(userId: string, id: string) {
  const existing = await db.learningItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  await db.learningItem.delete({ where: { id } });
  return { id };
}

export async function updateItemStatus(
  userId: string,
  id: string,
  status: ItemStatus,
) {
  const existing = await db.learningItem.findFirst({
    where: { id, userId },
    select: { id: true, status: true, startedAt: true, completedAt: true },
  });
  if (!existing) return null;

  const patch: Record<string, unknown> = { status };
  if (status === ItemStatus.IN_PROGRESS && !existing.startedAt) {
    patch.startedAt = new Date();
  }
  if (status === ItemStatus.COMPLETED) {
    patch.completedAt = new Date();
    patch.progressPercent = 100;
  } else if (existing.status === ItemStatus.COMPLETED) {
    // Moving out of COMPLETED clears completedAt.
    patch.completedAt = null;
  }

  return db.learningItem.update({ where: { id }, data: patch });
}

export async function updateItemProgress(
  userId: string,
  id: string,
  nextProgress: number,
) {
  const existing = await db.learningItem.findFirst({
    where: { id, userId },
    select: { id: true, status: true, startedAt: true },
  });
  if (!existing) return null;

  const derived = deriveStatusOnProgress(existing.status, nextProgress);
  const patch: Record<string, unknown> = {
    progressPercent: nextProgress,
    status: derived.nextStatus,
  };
  if (derived.startedAt && !existing.startedAt) {
    patch.startedAt = derived.startedAt;
  }
  const item = await db.learningItem.update({ where: { id }, data: patch });
  const autoStarted = derived.nextStatus !== existing.status;
  return {
    item,
    shouldPromptComplete: derived.shouldPromptComplete,
    autoStarted,
  };
}

export async function updateItemNotes(
  userId: string,
  id: string,
  notes: string,
) {
  const existing = await db.learningItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  return db.learningItem.update({
    where: { id },
    data: { notes },
  });
}

/**
 * Pure helper — the single source of truth for status auto-derivation.
 * Used by updateItemProgress and any future bulk update flow.
 */
export function deriveStatusOnProgress(
  currentStatus: ItemStatus,
  nextProgress: number,
): {
  nextStatus: ItemStatus;
  startedAt?: Date;
  shouldPromptComplete: boolean;
} {
  let nextStatus = currentStatus;
  let startedAt: Date | undefined;
  if (nextProgress > 0 && currentStatus === ItemStatus.BACKLOG) {
    nextStatus = ItemStatus.IN_PROGRESS;
    startedAt = new Date();
  }
  const shouldPromptComplete =
    nextProgress >= 100 && currentStatus !== ItemStatus.COMPLETED;
  return { nextStatus, startedAt, shouldPromptComplete };
}
