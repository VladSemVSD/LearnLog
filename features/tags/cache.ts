import { createCacheNamespace } from "@/lib/cache";
import { itemsCache } from "@/features/learning-items/cache";

/**
 * Tag-list reads (`listTags`) live here. Tag mutations cascade to items
 * because tag chips render on item rows — renaming or deleting a tag must
 * refresh the item list to show the new copy.
 */
export const tagsCache = createCacheNamespace({
  key: "tags",
  cascadesTo: [itemsCache],
});
