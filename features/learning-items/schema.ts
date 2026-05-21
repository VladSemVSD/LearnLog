import { z } from "zod";
import { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";

const itemTypeValues = Object.values(ItemType) as [ItemType, ...ItemType[]];
const itemStatusValues = Object.values(ItemStatus) as [ItemStatus, ...ItemStatus[]];

const optionalUrl = z
  .string()
  .url("Must be a valid URL")
  .optional()
  .nullable()
  .or(z.literal(""));

export const createItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(itemTypeValues),
  status: z.enum(itemStatusValues).default(ItemStatus.BACKLOG),
  priority: z.number().int().min(0).max(3).default(0),
  progressPercent: z.number().int().min(0).max(100).default(0),
  estimatedHours: z.number().min(0).optional().nullable(),
  actualHours: z.number().min(0).optional().nullable(),
  sourceUrl: optionalUrl,
  notes: z.string().max(20_000).optional().nullable(),
});

// Plain fields only — no lifecycle-affecting fields (status, progressPercent).
// See docs/adr/0002-split-actions-along-lifecycle-boundary.md.
const itemPlainPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(itemTypeValues).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  actualHours: z.number().min(0).nullable().optional(),
  sourceUrl: optionalUrl,
  notes: z.string().max(20_000).nullable().optional(),
});

export const updateItemFieldsSchema = z.object({
  id: z.string().min(1),
  patch: itemPlainPatchSchema.refine(
    (p) => Object.keys(p).length > 0,
    { message: "Patch must include at least one field" },
  ),
});

export const updateItemStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(itemStatusValues),
});

export const updateItemProgressSchema = z.object({
  id: z.string().min(1),
  progressPercent: z.number().int().min(0).max(100),
});

export const deleteItemSchema = z.object({
  id: z.string().min(1),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemFieldsInput = z.infer<typeof updateItemFieldsSchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
export type UpdateItemProgressInput = z.infer<typeof updateItemProgressSchema>;

export const itemFilterSchema = z.object({
  q: z.string().optional(),
  type: z.enum(itemTypeValues).optional(),
  status: z.enum(itemStatusValues).optional(),
  tagId: z.string().optional(),
});

export type ItemFilter = z.infer<typeof itemFilterSchema>;
