import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
}));

import { updateTag } from "next/cache";
import { createCacheNamespace } from "./cache";

const USER_ID = "u_1";

beforeEach(() => {
  vi.mocked(updateTag).mockReset();
});

describe("createCacheNamespace — tagFor", () => {
  it("returns ${key}:${userId} exactly", () => {
    const ns = createCacheNamespace({ key: "items" });
    expect(ns.tagFor(USER_ID)).toBe(`items:${USER_ID}`);
  });

  it("exposes the key field as-is", () => {
    const ns = createCacheNamespace({ key: "items" });
    expect(ns.key).toBe("items");
  });
});

describe("createCacheNamespace — invalidate", () => {
  it("calls updateTag once with the namespace's own tag", () => {
    const ns = createCacheNamespace({ key: "items" });
    ns.invalidate(USER_ID);
    expect(updateTag).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith(`items:${USER_ID}`);
  });

  it("with cascadesTo, invalidates own tag AND each cascade target's tag", () => {
    const itemsCache = createCacheNamespace({ key: "items" });
    const tagsCache = createCacheNamespace({
      key: "tags",
      cascadesTo: [itemsCache],
    });
    tagsCache.invalidate(USER_ID);
    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith(`tags:${USER_ID}`);
    expect(updateTag).toHaveBeenCalledWith(`items:${USER_ID}`);
  });

  it("cascades are one-level only — does NOT follow B.cascadesTo when invalidating A", () => {
    const c = createCacheNamespace({ key: "c" });
    const b = createCacheNamespace({ key: "b", cascadesTo: [c] });
    const a = createCacheNamespace({ key: "a", cascadesTo: [b] });

    a.invalidate(USER_ID);

    // Should invalidate a and b but NOT c — regression guard for the
    // intentional non-transitive design from the architecture audit.
    expect(updateTag).toHaveBeenCalledTimes(2);
    expect(updateTag).toHaveBeenCalledWith(`a:${USER_ID}`);
    expect(updateTag).toHaveBeenCalledWith(`b:${USER_ID}`);
    expect(updateTag).not.toHaveBeenCalledWith(`c:${USER_ID}`);
  });
});
