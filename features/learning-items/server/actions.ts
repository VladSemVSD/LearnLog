"use server";

import { defineAction } from "@/lib/actions";
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
  deleteItemSchema,
  updateItemNotesSchema,
  updateItemProgressSchema,
  updateItemSchema,
  updateItemStatusSchema,
} from "../schema";

const ITEMS = "items" as const;

export const createItemAction = defineAction({
  schema: createItemSchema,
  invalidates: [ITEMS],
  service: (userId, input) => createItem(userId, input),
  map: (item) => ({ id: item.id }),
});

export const updateItemAction = defineAction({
  schema: updateItemSchema,
  invalidates: [ITEMS],
  service: (userId, input) => updateItem(userId, input),
  map: (item) => ({ id: item.id }),
});

export const deleteItemAction = defineAction({
  schema: deleteItemSchema,
  invalidates: [ITEMS],
  service: (userId, input) => deleteItem(userId, input.id),
  map: (result) => ({ id: result.id }),
});

export const updateItemStatusAction = defineAction({
  schema: updateItemStatusSchema,
  invalidates: [ITEMS],
  service: (userId, input) =>
    updateItemStatus(userId, input.id, input.status),
  map: (item) => ({ id: item.id }),
});

export const updateItemProgressAction = defineAction({
  schema: updateItemProgressSchema,
  invalidates: [ITEMS],
  service: (userId, input) =>
    updateItemProgress(userId, input.id, input.progressPercent),
  map: (result) => ({
    id: result.item.id,
    shouldPromptComplete: result.shouldPromptComplete,
    autoStarted: result.autoStarted,
  }),
});

export const updateItemNotesAction = defineAction({
  schema: updateItemNotesSchema,
  invalidates: [ITEMS],
  service: (userId, input) => updateItemNotes(userId, input.id, input.notes),
  map: (item) => ({ id: item.id }),
});
