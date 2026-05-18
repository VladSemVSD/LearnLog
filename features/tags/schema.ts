import { z } from "zod";

const optionalHexColor = z
  .string()
  .regex(/^#?[0-9a-fA-F]{6}$/i, "Must be a 6-digit hex color")
  .optional()
  .nullable()
  .or(z.literal(""));

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(30, "Keep tag names short (≤ 30 chars)")
    .trim(),
  color: optionalHexColor,
});

export const updateTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(30).trim().optional(),
  color: optionalHexColor,
});

export const tagAttachmentSchema = z.object({
  itemId: z.string().min(1),
  tagId: z.string().min(1),
});

export const deleteTagSchema = z.object({
  id: z.string().min(1),
});

export type CreateTagInput = z.input<typeof createTagSchema>;
export type UpdateTagInput = z.input<typeof updateTagSchema>;
export type TagAttachmentInput = z.input<typeof tagAttachmentSchema>;
