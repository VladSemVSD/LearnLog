import { describe, expect, it } from "vitest";
import {
  hasConstrainingItemsFilter,
  itemsFilterIsUntouched,
  parseItemsSearchParams,
  parseItemsURLSearchParams,
  serializeItemsFilter,
} from "./items-search-params";
import { DEFAULT_ITEM_SORT } from "./schema";

describe("parseItemsSearchParams", () => {
  it("returns defaults for empty input", () => {
    expect(parseItemsSearchParams({})).toEqual({ sort: DEFAULT_ITEM_SORT });
  });

  it("maps `tag` -> `tagId` and parses each field", () => {
    const parsed = parseItemsSearchParams({
      q: "rust",
      type: "BOOK",
      status: "IN_PROGRESS",
      tag: "tag-123",
      sort: "title-asc",
    });
    expect(parsed).toEqual({
      q: "rust",
      type: "BOOK",
      status: "IN_PROGRESS",
      tagId: "tag-123",
      sort: "title-asc",
    });
  });

  it("takes the first value of an array-shaped param", () => {
    const parsed = parseItemsSearchParams({ q: ["one", "two"] });
    expect(parsed.q).toBe("one");
  });

  it("falls back to default sort when an unknown value is supplied", () => {
    const parsed = parseItemsSearchParams({ sort: "garbage" });
    expect(parsed.sort).toBe(DEFAULT_ITEM_SORT);
  });
});

describe("parseItemsURLSearchParams", () => {
  it("decodes a URLSearchParams the same way as the server-side parser", () => {
    const p = new URLSearchParams("q=rust&tag=t1&sort=priority-desc");
    expect(parseItemsURLSearchParams(p)).toEqual({
      q: "rust",
      tagId: "t1",
      sort: "priority-desc",
    });
  });
});

describe("serializeItemsFilter", () => {
  it("omits empty values and the default sort", () => {
    const out = serializeItemsFilter({ sort: DEFAULT_ITEM_SORT });
    expect(out.toString()).toBe("");
  });

  it("includes set values and uses `tag` not `tagId` in the URL", () => {
    const out = serializeItemsFilter({
      q: "rust",
      tagId: "t1",
      type: "BOOK",
      sort: "title-asc",
    });
    expect(out.get("q")).toBe("rust");
    expect(out.get("tag")).toBe("t1");
    expect(out.get("tagId")).toBeNull();
    expect(out.get("type")).toBe("BOOK");
    expect(out.get("sort")).toBe("title-asc");
  });

  it("with keepSort:true, emits the default sort too (used by sort-header builder)", () => {
    const out = serializeItemsFilter(
      { sort: DEFAULT_ITEM_SORT },
      { keepSort: true },
    );
    expect(out.get("sort")).toBe(DEFAULT_ITEM_SORT);
  });
});

describe("itemsFilterIsUntouched / hasConstrainingItemsFilter", () => {
  it("untouched: default sort and no other filters", () => {
    expect(itemsFilterIsUntouched({ sort: DEFAULT_ITEM_SORT })).toBe(true);
    expect(
      itemsFilterIsUntouched({ sort: DEFAULT_ITEM_SORT, q: "x" }),
    ).toBe(false);
    expect(
      itemsFilterIsUntouched({ sort: "title-asc" }),
    ).toBe(false);
  });

  it("constraining: any of q, type, status, tagId set — sort alone does NOT constrain", () => {
    expect(
      hasConstrainingItemsFilter({ sort: DEFAULT_ITEM_SORT }),
    ).toBe(false);
    expect(
      hasConstrainingItemsFilter({ sort: "title-asc" }),
    ).toBe(false);
    expect(
      hasConstrainingItemsFilter({ sort: DEFAULT_ITEM_SORT, q: "x" }),
    ).toBe(true);
    expect(
      hasConstrainingItemsFilter({ sort: DEFAULT_ITEM_SORT, tagId: "t1" }),
    ).toBe(true);
  });
});
