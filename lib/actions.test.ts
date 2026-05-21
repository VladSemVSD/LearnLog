import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/features/auth/server", () => ({
  requireUser: vi.fn(),
}));

import { updateTag } from "next/cache";
import { requireUser } from "@/features/auth/server";
import { ActionError, defineAction, isUniqueViolation } from "./actions";
import { createCacheNamespace } from "./cache";

const USER_ID = "u_1";

const schema = z.object({ name: z.string().min(1) });

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: USER_ID } as never);
  vi.mocked(updateTag).mockReset();
});

describe("defineAction — happy path", () => {
  it("parses, runs the service, invalidates each namespace exactly once, maps the result", async () => {
    const itemsCache = createCacheNamespace({ key: "items" });
    const tagsCache = createCacheNamespace({ key: "tags" });
    const service = vi.fn().mockResolvedValue({ id: "x_1", internal: "yep" });
    const action = defineAction({
      schema,
      invalidates: [itemsCache, tagsCache],
      service,
      map: (r: { id: string }) => ({ id: r.id }),
    });

    const result = await action({ name: "hello" });

    expect(result).toEqual({ ok: true, data: { id: "x_1" } });
    expect(service).toHaveBeenCalledWith(USER_ID, { name: "hello" });
    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith(`items:${USER_ID}`);
    expect(updateTag).toHaveBeenCalledWith(`tags:${USER_ID}`);
  });
});

describe("defineAction — failure envelopes", () => {
  it("Zod parse failure returns fieldErrors keyed by the first path segment", async () => {
    const action = defineAction({
      schema,
      service: vi.fn(),
      map: (r) => r,
    });

    const result = await action({ name: "" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Validation failed");
    expect(result.fieldErrors?.name?.length).toBeGreaterThan(0);
  });

  it("service returning null surfaces 'Not found.'", async () => {
    const action = defineAction({
      schema,
      service: vi.fn().mockResolvedValue(null),
      map: (r) => r,
    });

    const result = await action({ name: "x" });

    expect(result).toEqual({ ok: false, error: "Not found." });
  });

  it("ActionError from the service propagates its payload to the envelope", async () => {
    const action = defineAction({
      schema,
      service: vi.fn().mockImplementation(() => {
        throw new ActionError({
          error: "Tag name taken",
          fieldErrors: { name: ["Already exists"] },
        });
      }),
      map: (r) => r,
    });

    const result = await action({ name: "x" });

    expect(result).toEqual({
      ok: false,
      error: "Tag name taken",
      fieldErrors: { name: ["Already exists"] },
    });
  });

  it("non-ActionError exceptions bubble up", async () => {
    const action = defineAction({
      schema,
      service: vi.fn().mockRejectedValue(new Error("boom")),
      map: (r) => r,
    });

    await expect(action({ name: "x" })).rejects.toThrow("boom");
  });
});

describe("defineAction — cache invalidation gating", () => {
  it("does not invalidate on parse failure", async () => {
    const itemsCache = createCacheNamespace({ key: "items" });
    const action = defineAction({
      schema,
      invalidates: [itemsCache],
      service: vi.fn(),
      map: (r) => r,
    });

    await action({ name: "" });

    expect(updateTag).not.toHaveBeenCalled();
  });

  it("does not invalidate when the service returns null", async () => {
    const itemsCache = createCacheNamespace({ key: "items" });
    const action = defineAction({
      schema,
      invalidates: [itemsCache],
      service: vi.fn().mockResolvedValue(null),
      map: (r) => r,
    });

    await action({ name: "x" });

    expect(updateTag).not.toHaveBeenCalled();
  });

  it("omitting invalidates still succeeds with no updateTag calls", async () => {
    const action = defineAction({
      schema,
      service: vi.fn().mockResolvedValue({ id: "x_1" }),
      map: (r) => r,
    });

    const result = await action({ name: "x" });

    expect(result.ok).toBe(true);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("isUniqueViolation", () => {
  it("returns true for Prisma-shaped P2002 errors", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });

  it("returns false for anything else", () => {
    expect(isUniqueViolation({ code: "P2003" })).toBe(false);
    expect(isUniqueViolation(new Error("nope"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
