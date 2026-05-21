import {
  DEFAULT_ITEM_SORT,
  itemFilterSchema,
  type ItemFilter,
} from "./schema";

export type ItemsSearchInput = Record<
  string,
  string | string[] | undefined
>;

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseItemsSearchParams(sp: ItemsSearchInput): ItemFilter {
  const parsed = itemFilterSchema.safeParse({
    q: firstParam(sp.q),
    type: firstParam(sp.type),
    status: firstParam(sp.status),
    tagId: firstParam(sp.tag),
    sort: firstParam(sp.sort),
  });
  return parsed.success ? parsed.data : { sort: DEFAULT_ITEM_SORT };
}

export function parseItemsURLSearchParams(p: URLSearchParams): ItemFilter {
  return parseItemsSearchParams({
    q: p.get("q") ?? undefined,
    type: p.get("type") ?? undefined,
    status: p.get("status") ?? undefined,
    tag: p.get("tag") ?? undefined,
    sort: p.get("sort") ?? undefined,
  });
}

// Serializes a filter to URLSearchParams. Omits empty/default values so the
// resulting URL stays clean. `keepSort: true` always emits the sort key — used
// when building sort-header hrefs that need to override sort while keeping
// other filters as-is.
export function serializeItemsFilter(
  filter: Partial<ItemFilter>,
  opts: { keepSort?: boolean } = {},
): URLSearchParams {
  const out = new URLSearchParams();
  if (filter.q) out.set("q", filter.q);
  if (filter.type) out.set("type", filter.type);
  if (filter.status) out.set("status", filter.status);
  if (filter.tagId) out.set("tag", filter.tagId);
  if (filter.sort && (opts.keepSort || filter.sort !== DEFAULT_ITEM_SORT)) {
    out.set("sort", filter.sort);
  }
  return out;
}

export function itemsFilterIsUntouched(filter: ItemFilter): boolean {
  return (
    !filter.q &&
    !filter.type &&
    !filter.status &&
    !filter.tagId &&
    (filter.sort ?? DEFAULT_ITEM_SORT) === DEFAULT_ITEM_SORT
  );
}

export function hasConstrainingItemsFilter(filter: ItemFilter): boolean {
  return Boolean(filter.q || filter.type || filter.status || filter.tagId);
}
