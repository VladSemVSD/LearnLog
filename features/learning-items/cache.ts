import { createCacheNamespace } from "@/lib/cache";

export const itemsCache = createCacheNamespace({ key: "items" });
