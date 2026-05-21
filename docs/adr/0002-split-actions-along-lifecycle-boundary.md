# Split LearningItem update actions along the lifecycle boundary

## Status

Accepted (2026-05-21)

## Context

Phase 3 introduces JIRA-style row-expand inline autosave editing. Every field on a `LearningItem` becomes editable inline and commits via its own server action. The obvious shape — one generic `updateItemFieldAction({ id, patch: Partial<ItemFields> })` — is tempting: it collapses the four existing update actions (`updateItemAction`, `updateItemStatusAction`, `updateItemProgressAction`, `updateItemNotesAction`) into one entry point, and the action runner is thin enough that "one action vs three" looks like pure savings.

But the `LearningItem` **lifecycle** (`features/learning-items/lifecycle.ts`) is a state machine whose intents (`'create' | 'setStatus' | 'setProgress'`) each assume **one axis is changing**. Calling `setStatus` and `setProgress` back-to-back on the same patch leaks the auto-promotion rule: a patch like `{ status: 'BACKLOG', progressPercent: 50 }` would commit BACKLOG first, then the `setProgress` intent against the post-status snapshot would see "BACKLOG + progress > 0" and silently auto-promote status back to `IN_PROGRESS` — overriding the user's explicit intent. A patch like `{ status: 'COMPLETED', progressPercent: 80 }` would land in an incoherent state (COMPLETED with 80% progress), violating the documented invariant.

These bugs are structurally impossible today because each per-field action carries exactly one lifecycle-affecting field. A combined-patch action would need either a schema-level mutual exclusion (`.refine` rejecting status + progress in the same patch), or a new lifecycle intent kind that handles the combined case coherently, or it would have to live with the bugs.

## Decision

Split the update surface along the lifecycle boundary, not field count. Three actions:

- **`updateItemFieldsAction({ id, patch })`** — accepts the **plain fields** only (`title`, `description`, `type`, `priority`, `sourceUrl`, `estimatedHours`, `actualHours`, `notes`). Goes straight to `updateScoped` with no lifecycle module call. `notes` is folded in here.
- **`updateItemStatusAction`** — unchanged. Single `status` field. Routes through `applyLifecycleIntent({ kind: 'setStatus' })`.
- **`updateItemProgressAction`** — unchanged. Single `progressPercent` field. Routes through `applyLifecycleIntent({ kind: 'setProgress' })`. Returns `prompts: ['confirm-complete']` and `autoStarted` for the UI to surface.

The bulk `updateItemAction` (used by the now-deleted edit form) and `updateItemNotesAction` (folded into the plain bag) are removed. `updateItemFieldsSchema` does not include `status` or `progressPercent` in its patch shape — the impossibility lives in the TypeScript type, not in a runtime refine.

## Considered alternatives

- **One generic `updateItemFieldAction` with schema-level mutual exclusion (`status XOR progress` via `.refine`).** Keeps the "one action" simplification but moves the impossibility from the type system to a runtime guard. Still couples plain-field writes to lifecycle code paths inside the service. Rejected: the win of "one action" disappears once the action body needs three branches anyway.
- **Extend the lifecycle module with a `{ kind: 'setStatusAndProgress', ... }` intent.** Lets the combined-patch action be coherent without splitting. Bloats the lifecycle state machine to handle a case the UI never produces — autosave-on-blur fires one field per save. Rejected as solving a hypothetical.
- **Keep the existing per-field actions exactly as-is.** Doesn't address the plain-field bulk path; the edit form's `updateItemAction` would have to survive after the form goes away. Rejected: a bulk plain-field write is still needed (the create flow returns to the detail page where bulk edits happen).

## Consequences

- A future reader sees three update actions and may want to "simplify" them into one. This ADR is the reason not to.
- The `updateItemFieldsAction` patch type omits `status` and `progressPercent`. Callers who need both must fire two actions sequentially (which the UI never does — each autosave fires one field).
- `lifecycle.ts` keeps its one-axis-at-a-time assumption. New intent kinds added in the future (e.g., `setEstimatedHours` if it ever becomes lifecycle-affecting) follow the same pattern: a dedicated intent kind and a dedicated action.
- The action runner gains nothing special — `defineAction` still owns the contract, and three ~6-line declarations are a non-issue.
- See `CONTEXT.md` for the canonical glossary entries: **plain field** vs **lifecycle-affecting field**.
