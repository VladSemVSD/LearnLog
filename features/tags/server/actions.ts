"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/server";
import {
  attachTag,
  createTag,
  deleteTag,
  detachTag,
  renameTag,
} from "../service";
import {
  createTagSchema,
  tagAttachmentSchema,
  updateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
  type TagAttachmentInput,
} from "../schema";

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};
type ActionResult<T> = ActionOk<T> | ActionErr;

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue;
    const key = String(issue.path[0]);
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function invalidateTags(userId: string) {
  updateTag(`tags:${userId}`);
}

function invalidateItems(userId: string) {
  updateTag(`items:${userId}`);
}

export async function createTagAction(
  input: CreateTagInput,
): Promise<ActionResult<{ id: string; name: string }>> {
  const user = await requireUser();
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    const tag = await createTag(user.id, parsed.data);
    invalidateTags(user.id);
    // Tag list affects items (chips), so item reads must re-fetch.
    invalidateItems(user.id);
    return { ok: true, data: { id: tag.id, name: tag.name } };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return {
        ok: false,
        error: "A tag with that name already exists.",
        fieldErrors: { name: ["A tag with that name already exists."] },
      };
    }
    throw err;
  }
}

export async function updateTagAction(
  input: UpdateTagInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateTagSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    const tag = await renameTag(user.id, parsed.data.id, {
      name: parsed.data.name,
      color: parsed.data.color ?? undefined,
    });
    if (!tag) return { ok: false, error: "Tag not found." };
    invalidateTags(user.id);
    invalidateItems(user.id);
    return { ok: true, data: { id: tag.id } };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return {
        ok: false,
        error: "A tag with that name already exists.",
        fieldErrors: { name: ["A tag with that name already exists."] },
      };
    }
    throw err;
  }
}

export async function deleteTagAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  if (!id) return { ok: false, error: "Missing tag id." };
  const result = await deleteTag(user.id, id);
  if (!result) return { ok: false, error: "Tag not found." };
  invalidateTags(user.id);
  invalidateItems(user.id);
  return { ok: true, data: { id } };
}

export async function attachTagAction(
  input: TagAttachmentInput,
): Promise<ActionResult<{ itemId: string; tagId: string }>> {
  const user = await requireUser();
  const parsed = tagAttachmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const result = await attachTag(
    user.id,
    parsed.data.itemId,
    parsed.data.tagId,
  );
  if (!result) return { ok: false, error: "Tag or item not found." };
  invalidateItems(user.id);
  return { ok: true, data: result };
}

export async function detachTagAction(
  input: TagAttachmentInput,
): Promise<ActionResult<{ itemId: string; tagId: string }>> {
  const user = await requireUser();
  const parsed = tagAttachmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const result = await detachTag(
    user.id,
    parsed.data.itemId,
    parsed.data.tagId,
  );
  if (!result) return { ok: false, error: "Item not found." };
  invalidateItems(user.id);
  return { ok: true, data: result };
}
