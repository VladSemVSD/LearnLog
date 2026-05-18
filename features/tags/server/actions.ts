"use server";

import { ActionError, defineAction, isUniqueViolation } from "@/lib/actions";
import {
  attachTag,
  createTag,
  deleteTag,
  detachTag,
  renameTag,
} from "../service";
import {
  createTagSchema,
  deleteTagSchema,
  tagAttachmentSchema,
  updateTagSchema,
} from "../schema";

const ITEMS = "items" as const;
const TAGS = "tags" as const;

const UNIQUE_NAME = new ActionError({
  error: "A tag with that name already exists.",
  fieldErrors: { name: ["A tag with that name already exists."] },
});

export const createTagAction = defineAction({
  schema: createTagSchema,
  // Tag list affects items list (chips render on item rows).
  invalidates: [TAGS, ITEMS],
  service: async (userId, input) => {
    try {
      return await createTag(userId, input);
    } catch (err) {
      if (isUniqueViolation(err)) throw UNIQUE_NAME;
      throw err;
    }
  },
  map: (tag) => ({ id: tag.id, name: tag.name }),
});

export const updateTagAction = defineAction({
  schema: updateTagSchema,
  invalidates: [TAGS, ITEMS],
  service: async (userId, input) => {
    try {
      return await renameTag(userId, input.id, {
        name: input.name,
        color: input.color ?? undefined,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw UNIQUE_NAME;
      throw err;
    }
  },
  map: (tag) => ({ id: tag.id }),
});

export const deleteTagAction = defineAction({
  schema: deleteTagSchema,
  invalidates: [TAGS, ITEMS],
  service: (userId, input) => deleteTag(userId, input.id),
  map: (result) => ({ id: result.id }),
});

export const attachTagAction = defineAction({
  schema: tagAttachmentSchema,
  invalidates: [ITEMS],
  service: (userId, input) => attachTag(userId, input.itemId, input.tagId),
  map: (result) => result,
});

export const detachTagAction = defineAction({
  schema: tagAttachmentSchema,
  invalidates: [ITEMS],
  service: (userId, input) => detachTag(userId, input.itemId, input.tagId),
  map: (result) => result,
});
