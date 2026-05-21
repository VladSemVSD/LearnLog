"use server";

import { defineAction } from "@/lib/actions";
import { itemsCache } from "../cache";
import {
  createItem,
  deleteItem,
  updateItemFields,
  updateItemProgress,
  updateItemStatus,
} from "../service";
import {
  createItemSchema,
  deleteItemSchema,
  updateItemFieldsSchema,
  updateItemProgressSchema,
  updateItemStatusSchema,
} from "../schema";

const writesItems = [itemsCache] as const;

export const createItemAction = defineAction({
  schema: createItemSchema,
  invalidates: writesItems,
  service: (userId, input) => createItem(userId, input),
  map: (item) => ({ id: item.id }),
});

export const updateItemFieldsAction = defineAction({
  schema: updateItemFieldsSchema,
  invalidates: writesItems,
  service: (userId, input) => updateItemFields(userId, input.id, input.patch),
  map: (result) => ({ id: result.id }),
});

export const deleteItemAction = defineAction({
  schema: deleteItemSchema,
  invalidates: writesItems,
  service: (userId, input) => deleteItem(userId, input.id),
  map: (result) => ({ id: result.id }),
});

export const updateItemStatusAction = defineAction({
  schema: updateItemStatusSchema,
  invalidates: writesItems,
  service: (userId, input) =>
    updateItemStatus(userId, input.id, input.status),
  map: (item) => ({ id: item.id }),
});

export const updateItemProgressAction = defineAction({
  schema: updateItemProgressSchema,
  invalidates: writesItems,
  service: (userId, input) =>
    updateItemProgress(userId, input.id, input.progressPercent),
  map: (result) => ({
    id: result.item.id,
    shouldPromptComplete: result.shouldPromptComplete,
    autoStarted: result.autoStarted,
  }),
});
