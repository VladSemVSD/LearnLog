import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { ItemStatus } from "@/lib/generated/prisma/client";
import type {
  CreateItemInput,
  ItemFilter,
  UpdateItemInput,
} from "./schema";
import {
  applyLifecycleIntent,
  type CurrentLifecycle,
} from "./lifecycle";

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

export function getInProgressItems(userId: string, limit = 5) {
  return unstable_cache(
    async () =>
      db.learningItem.findMany({
        where: { userId, status: ItemStatus.IN_PROGRESS },
        orderBy: { updatedAt: "desc" },
        take: limit,
        include: includeTags,
      }),
    ["dashboard-in-progress", userId, String(limit)],
    { tags: [itemsTag(userId)], revalidate: ONE_HOUR },
  )();
}

export function getRecentlyCompleted(userId: string, limit = 5) {
  return unstable_cache(
    async () =>
      db.learningItem.findMany({
        where: { userId, status: ItemStatus.COMPLETED },
        orderBy: { completedAt: "desc" },
        take: limit,
        include: includeTags,
      }),
    ["dashboard-recent-completed", userId, String(limit)],
    { tags: [itemsTag(userId)], revalidate: ONE_HOUR },
  )();
}

export function getStaleItems(userId: string, days = 14, limit = 5) {
  return unstable_cache(
    async () => {
      const cutoff = new Date(Date.now() - days * 86_400_000);
      return db.learningItem.findMany({
        where: {
          userId,
          status: ItemStatus.IN_PROGRESS,
          updatedAt: { lt: cutoff },
        },
        orderBy: { updatedAt: "asc" },
        take: limit,
        include: includeTags,
      });
    },
    ["dashboard-stale", userId, String(days), String(limit)],
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

function normalizeSourceUrl(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
}

export async function createItem(userId: string, input: CreateItemInput) {
  // Lifecycle owns status + the dependent fields. Other fields come from input.
  const { patch } = applyLifecycleIntent(
    {
      status: ItemStatus.BACKLOG,
      startedAt: null,
      completedAt: null,
      progressPercent: 0,
    },
    {
      kind: "create",
      status: input.status ?? ItemStatus.BACKLOG,
      progressPercent: input.progressPercent ?? 0,
    },
  );

  return db.learningItem.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      priority: input.priority ?? 0,
      estimatedHours: input.estimatedHours ?? null,
      actualHours: input.actualHours ?? null,
      sourceUrl: normalizeSourceUrl(input.sourceUrl) ?? null,
      notes: input.notes ?? null,
      status: patch.status ?? ItemStatus.BACKLOG,
      startedAt: patch.startedAt ?? null,
      completedAt: patch.completedAt ?? null,
      progressPercent: patch.progressPercent ?? 0,
    },
  });
}

export async function updateItem(userId: string, input: UpdateItemInput) {
  const { id, tagIds, status: _statusIgnored, ...rest } = input;
  void tagIds;
  void _statusIgnored; // Status changes go through updateItemStatus (lifecycle).
  const sourceUrl = normalizeSourceUrl(rest.sourceUrl);
  const existing = await db.learningItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  return db.learningItem.update({
    where: { id },
    data: {
      ...rest,
      ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    },
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

async function loadLifecycle(
  userId: string,
  id: string,
): Promise<CurrentLifecycle | null> {
  const existing = await db.learningItem.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      progressPercent: true,
    },
  });
  if (!existing) return null;
  return {
    status: existing.status,
    startedAt: existing.startedAt,
    completedAt: existing.completedAt,
    progressPercent: existing.progressPercent,
  };
}

export async function updateItemStatus(
  userId: string,
  id: string,
  status: ItemStatus,
) {
  const current = await loadLifecycle(userId, id);
  if (!current) return null;

  const { patch } = applyLifecycleIntent(current, {
    kind: "setStatus",
    to: status,
  });

  return db.learningItem.update({ where: { id }, data: patch });
}

export async function updateItemProgress(
  userId: string,
  id: string,
  nextProgress: number,
) {
  const current = await loadLifecycle(userId, id);
  if (!current) return null;

  const { patch, prompts } = applyLifecycleIntent(current, {
    kind: "setProgress",
    value: nextProgress,
  });

  const item = await db.learningItem.update({ where: { id }, data: patch });
  return {
    item,
    shouldPromptComplete: prompts.includes("confirm-complete"),
    autoStarted: patch.status === ItemStatus.IN_PROGRESS,
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
