import "server-only";

/**
 * Scoped-write helpers — every service mutation that says "this is mine"
 * goes through these. The "scope" is whatever where-filter the caller passes
 * (today: `{ id, userId }`).
 *
 * Naming choice (intentionally neutral): called `Scoped` rather than `Owned`
 * because we may grow shared/team ownership later (multi-user item sharing,
 * roadmaps, etc). If/when that lands, this helper survives unchanged — only
 * the scope filter passed in by callers gets richer.
 *
 * Performance: collapses the legacy `findFirst({id,userId}) → if (!existing)
 * return null → update({id}, ...)` pattern (2 DB hops) into a single
 * `updateMany({where:{id,userId}, data})` (1 hop). count === 0 means
 * "absent or out of scope" — the architecture intentionally 404s instead of
 * 403s for cross-user accesses (no enumeration leak; see the foundational
 * plan in `~/.claude/plans/learning-portal-recursive-backus.md`).
 *
 * Returns `boolean` (true = at least one row affected). Service callers map
 * to whatever shape the action runner's `map` expects — usually `{ id }`,
 * which is already known to the caller from the input.
 */

type ScopedUpdateModel<W, D> = {
  updateMany(args: { where: W; data: D }): Promise<{ count: number }>;
};

type ScopedDeleteModel<W> = {
  deleteMany(args: { where: W }): Promise<{ count: number }>;
};

export async function updateScoped<W, D>(
  model: ScopedUpdateModel<W, D>,
  where: W,
  data: D,
): Promise<boolean> {
  const { count } = await model.updateMany({ where, data });
  return count > 0;
}

export async function deleteScoped<W>(
  model: ScopedDeleteModel<W>,
  where: W,
): Promise<boolean> {
  const { count } = await model.deleteMany({ where });
  return count > 0;
}
