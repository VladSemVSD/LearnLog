"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/server";
import {
  createItem,
  deleteItem,
  updateItem,
  updateItemNotes,
  updateItemProgress,
  updateItemStatus,
} from "../service";
import {
  createItemSchema,
  updateItemNotesSchema,
  updateItemProgressSchema,
  updateItemSchema,
  updateItemStatusSchema,
} from "../schema";

type CreateItemFormInput = z.input<typeof createItemSchema>;
type UpdateItemFormInput = z.input<typeof updateItemSchema>;

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

function invalidateItems(userId: string) {
  // Next 16: updateTag is the server-action API for read-your-own-writes
  // semantics over unstable_cache tags (replaces revalidateTag in this role).
  updateTag(`items:${userId}`);
}

export async function createItemAction(
  input: CreateItemFormInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const item = await createItem(user.id, parsed.data);
  invalidateItems(user.id);
  return { ok: true, data: { id: item.id } };
}

export async function updateItemAction(
  input: UpdateItemFormInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const item = await updateItem(user.id, parsed.data);
  if (!item) return { ok: false, error: "Item not found." };
  invalidateItems(user.id);
  return { ok: true, data: { id: item.id } };
}

export async function deleteItemAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  if (!id) return { ok: false, error: "Missing item id." };
  const result = await deleteItem(user.id, id);
  if (!result) return { ok: false, error: "Item not found." };
  invalidateItems(user.id);
  return { ok: true, data: { id } };
}

export async function updateItemStatusAction(
  input: { id: string; status: string },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateItemStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }
  const item = await updateItemStatus(user.id, parsed.data.id, parsed.data.status);
  if (!item) return { ok: false, error: "Item not found." };
  invalidateItems(user.id);
  return { ok: true, data: { id: item.id } };
}

export async function updateItemProgressAction(
  input: { id: string; progressPercent: number },
): Promise<
  ActionResult<{
    id: string;
    shouldPromptComplete: boolean;
    autoStarted: boolean;
  }>
> {
  const user = await requireUser();
  const parsed = updateItemProgressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid progress value." };
  }
  const result = await updateItemProgress(
    user.id,
    parsed.data.id,
    parsed.data.progressPercent,
  );
  if (!result) return { ok: false, error: "Item not found." };
  invalidateItems(user.id);
  return {
    ok: true,
    data: {
      id: result.item.id,
      shouldPromptComplete: result.shouldPromptComplete,
      autoStarted: result.autoStarted,
    },
  };
}

export async function updateItemNotesAction(
  input: { id: string; notes: string },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateItemNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid notes." };
  const item = await updateItemNotes(user.id, parsed.data.id, parsed.data.notes);
  if (!item) return { ok: false, error: "Item not found." };
  invalidateItems(user.id);
  return { ok: true, data: { id: item.id } };
}
