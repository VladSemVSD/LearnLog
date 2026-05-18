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
  tagIds: z.array(z.string()).default([]),
});

export const updateItemSchema = createItemSchema.partial().extend({
  id: z.string().min(1),
});

export const updateItemStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(itemStatusValues),
});

export const updateItemProgressSchema = z.object({
  id: z.string().min(1),
  progressPercent: z.number().int().min(0).max(100),
});

export const updateItemNotesSchema = z.object({
  id: z.string().min(1),
  notes: z.string().max(20_000),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
export type UpdateItemProgressInput = z.infer<typeof updateItemProgressSchema>;
export type UpdateItemNotesInput = z.infer<typeof updateItemNotesSchema>;

export const itemFilterSchema = z.object({
  q: z.string().optional(),
  type: z.enum(itemTypeValues).optional(),
  status: z.enum(itemStatusValues).optional(),
  tagId: z.string().optional(),
});

export type ItemFilter = z.infer<typeof itemFilterSchema>;
