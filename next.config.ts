import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Gates the `"use cache"` directive + `cacheTag` / `cacheLife` APIs.
   * With this on, the default rendering mode is static — components that
   * read cookies/headers/params/searchParams must sit inside `<Suspense>`
   * boundaries (or be explicitly marked dynamic). See
   * docs/adr/0001-use-cache-render-level.md for the broader decision.
   */
  cacheComponents: true,

  experimental: {
    /**
     * Keep the client Router Cache for dynamic routes warm for 30s after a
     * visit. In-app mutations call `router.refresh()` so they bypass the
     * stale window; only external mutations (Prisma Studio, another tab)
     * are subject to it.
     *
     * Ref: https://nextjs.org/docs/app/api-reference/config/next-config-js/staleTimes
     */
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
