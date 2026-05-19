/**
 * Partial skeleton for the items page — only the table area is replaced
 * during pending navigation. Header + filters bar stay visible from the
 * previous render so the page doesn't disappear. Fires on the dynamic
 * (filtered) render path; the cached (no-filter) path returns instantly
 * on cache hits and never reaches this fallback.
 */
export default function ItemsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-7 w-24 animate-pulse rounded" />
          <div className="bg-muted h-4 w-56 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-9 w-28 animate-pulse rounded-md" />
      </div>
      <div className="bg-muted h-10 animate-pulse rounded-md" />
      <div className="border-border bg-card overflow-hidden rounded-lg border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-border flex items-center gap-4 border-b p-4 last:border-b-0"
          >
            <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-4 w-32 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
