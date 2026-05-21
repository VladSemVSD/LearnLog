import "server-only";

import { db } from "@/lib/db";
import { ItemStatus } from "@/lib/generated/prisma/client";
import { deleteScoped, updateScoped } from "@/lib/ownership";
import type {
  CreateItemInput,
  ItemFilter,
  UpdateItemFieldsInput,
} from "./schema";
import {
  applyLifecycleIntent,
  type CurrentLifecycle,
} from "./lifecycle";

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
  return db.learningItem.findMany({
    where: buildWhere(userId, filter),
    orderBy: { updatedAt: "desc" },
    include: includeTags,
  });
}

export function getItem(userId: string, id: string) {
  return db.learningItem.findFirst({
    where: { id, userId },
    include: includeTags,
  });
}

export function getInProgressItems(userId: string, limit = 5) {
  return db.learningItem.findMany({
    where: { userId, status: ItemStatus.IN_PROGRESS },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: includeTags,
  });
}

export function getRecentlyCompleted(userId: string, limit = 5) {
  return db.learningItem.findMany({
    where: { userId, status: ItemStatus.COMPLETED },
    orderBy: { completedAt: "desc" },
    take: limit,
    include: includeTags,
  });
}

export function getUpNextItems(userId: string, limit = 5) {
  return db.learningItem.findMany({
    where: { userId, status: ItemStatus.BACKLOG },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit,
    include: includeTags,
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

export async function updateItemFields(
  userId: string,
  id: string,
  patch: UpdateItemFieldsInput["patch"],
) {
  // Plain fields only — status + progress flow through their own actions so
  // the lifecycle module's one-axis-at-a-time assumption holds.
  // See docs/adr/0002-split-actions-along-lifecycle-boundary.md.
  const sourceUrl = normalizeSourceUrl(patch.sourceUrl);
  const data = {
    ...patch,
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
  };
  const ok = await updateScoped(db.learningItem, { id, userId }, data);
  return ok ? { id } : null;
}

export async function deleteItem(userId: string, id: string) {
  const ok = await deleteScoped(db.learningItem, { id, userId });
  return ok ? { id } : null;
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

  const ok = await updateScoped(db.learningItem, { id, userId }, patch);
  return ok ? { id } : null;
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

  const ok = await updateScoped(db.learningItem, { id, userId }, patch);
  if (!ok) return null;
  return {
    item: { id },
    shouldPromptComplete: prompts.includes("confirm-complete"),
    autoStarted: patch.status === ItemStatus.IN_PROGRESS,
  };
}

