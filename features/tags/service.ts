import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

const ONE_HOUR = 3600;

function tagsTag(userId: string) {
  return `tags:${userId}`;
}

function normalizeColor(color: string | null | undefined): string | null {
  if (!color) return null;
  const trimmed = color.trim();
  if (trimmed === "") return null;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function listTags(userId: string) {
  return unstable_cache(
    async () =>
      db.tag.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
    ["tags", userId],
    { tags: [tagsTag(userId)], revalidate: ONE_HOUR },
  )();
}

export async function createTag(
  userId: string,
  input: { name: string; color?: string | null },
) {
  return db.tag.create({
    data: {
      userId,
      name: input.name,
      color: normalizeColor(input.color),
    },
  });
}

export async function renameTag(
  userId: string,
  id: string,
  patch: { name?: string; color?: string | null },
) {
  const existing = await db.tag.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.color !== undefined) data.color = normalizeColor(patch.color);
  return db.tag.update({ where: { id }, data });
}

export async function deleteTag(userId: string, id: string) {
  const existing = await db.tag.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  await db.tag.delete({ where: { id } });
  return { id };
}

async function ownsTag(userId: string, tagId: string) {
  const tag = await db.tag.findFirst({
    where: { id: tagId, userId },
    select: { id: true },
  });
  return Boolean(tag);
}

async function ownsItem(userId: string, itemId: string) {
  const item = await db.learningItem.findFirst({
    where: { id: itemId, userId },
    select: { id: true },
  });
  return Boolean(item);
}

export async function attachTag(
  userId: string,
  itemId: string,
  tagId: string,
) {
  if (!(await ownsTag(userId, tagId))) return null;
  if (!(await ownsItem(userId, itemId))) return null;
  // Upsert via the composite PK so re-attach is idempotent.
  await db.learningItemTag.upsert({
    where: { itemId_tagId: { itemId, tagId } },
    create: { itemId, tagId },
    update: {},
  });
  return { itemId, tagId };
}

export async function detachTag(
  userId: string,
  itemId: string,
  tagId: string,
) {
  if (!(await ownsItem(userId, itemId))) return null;
  await db.learningItemTag
    .delete({ where: { itemId_tagId: { itemId, tagId } } })
    .catch(() => null);
  return { itemId, tagId };
}
