import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemType } from "@/lib/generated/prisma/enums";

vi.mock("server-only", () => ({}));

const updateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    learningItem: {
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
  },
}));

import { updateItemFields } from "./service";
import { updateItemFieldsSchema } from "./schema";

const USER_ID = "u_1";
const ITEM_ID = "i_1";

beforeEach(() => {
  updateMany.mockReset();
  updateMany.mockResolvedValue({ count: 1 });
});

describe("updateItemFields — plain field writes", () => {
  it("forwards a single plain field to updateScoped untouched", async () => {
    const result = await updateItemFields(USER_ID, ITEM_ID, {
      title: "new title",
    });

    expect(result).toEqual({ id: ITEM_ID });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: ITEM_ID, userId: USER_ID },
      data: { title: "new title" },
    });
  });

  it("forwards multiple plain fields together", async () => {
    await updateItemFields(USER_ID, ITEM_ID, {
      title: "new title",
      priority: 2,
      type: ItemType.BOOK,
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: ITEM_ID, userId: USER_ID },
      data: { title: "new title", priority: 2, type: ItemType.BOOK },
    });
  });

  it("normalizes empty sourceUrl to null", async () => {
    await updateItemFields(USER_ID, ITEM_ID, { sourceUrl: "" });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: ITEM_ID, userId: USER_ID },
      data: { sourceUrl: null },
    });
  });

  it("returns null when the row isn't owned (updateMany count = 0)", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const result = await updateItemFields(USER_ID, ITEM_ID, { title: "x" });

    expect(result).toBeNull();
  });
});

describe("updateItemFieldsSchema — structural impossibilities", () => {
  it("rejects an empty patch", () => {
    const result = updateItemFieldsSchema.safeParse({
      id: ITEM_ID,
      patch: {},
    });
    expect(result.success).toBe(false);
  });

  it("does not accept status (lifecycle-affecting; lives in its own action)", () => {
    // status is structurally absent from the patch shape — TS would catch this
    // at compile time. At runtime, Zod's strict-by-default would not, since
    // it strips unknowns. We assert here that providing status does not pass
    // through to the data sent downstream.
    const result = updateItemFieldsSchema.safeParse({
      id: ITEM_ID,
      patch: { status: "COMPLETED", title: "ok" },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect("status" in result.data.patch).toBe(false);
    expect(result.data.patch).toEqual({ title: "ok" });
  });

  it("does not accept progressPercent", () => {
    const result = updateItemFieldsSchema.safeParse({
      id: ITEM_ID,
      patch: { progressPercent: 50, title: "ok" },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect("progressPercent" in result.data.patch).toBe(false);
  });
});
