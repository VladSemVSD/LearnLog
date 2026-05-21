# Learning Portal — Context

The domain language of a personal learning-tracking app. A single user records things they want to learn (`LearningItem`s), groups them with `Tag`s, and tracks each item through a lifecycle from `BACKLOG` to `COMPLETED` (or `DROPPED`).

## Language

**LearningItem**:
A single thing being tracked — a project, course, certification, video, book, or misc. Discriminated by `type`; otherwise one table.
_Avoid_: item record, learning record, entry.

**Type**:
The kind of thing a **LearningItem** is. `PROJECT | COURSE | CERTIFICATION | VIDEO | BOOK | MISC`. Set at creation, rarely changes.

**Status**:
Where a **LearningItem** currently sits in its lifecycle. `BACKLOG | PLANNED | IN_PROGRESS | PAUSED | COMPLETED | DROPPED`.

**Lifecycle**:
The coordinated movement of a **LearningItem**'s `status` together with its dependent side-fields (`startedAt`, `completedAt`, `progressPercent` when forced). Rules live in `features/learning-items/lifecycle.ts`. Pure function `applyLifecycleIntent(current, intent, now?)`.
_Avoid_: state machine (too general), status flow (only describes one axis).

**Lifecycle intent**:
A tagged request to change a **LearningItem**'s lifecycle slice. Kinds: `'create' | 'setStatus' | 'setProgress'`. Each kind assumes one axis is changing — combined intents are not supported.

**Lifecycle-affecting field**:
A field whose write must go through the **lifecycle** module: `status`, `progressPercent`. Server actions for these fields exist per-field (`updateItemStatusAction`, `updateItemProgressAction`).

**Plain field**:
A **LearningItem** field that writes directly via `updateScoped` with no lifecycle coupling: `title`, `description`, `type`, `priority`, `sourceUrl`, `estimatedHours`, `actualHours`, `notes`. Updated via a single bulk action (`updateItemFieldsAction`) accepting a partial patch.
_Avoid_: generic field (too vague), bulk field (implies multi-item).

**Tag**:
A user-scoped label that can be attached to many **LearningItem**s via the explicit `LearningItemTag` join table. Has a name and optional hex color.
_Avoid_: label, category (we use a single flat tag namespace per user).

**Cache namespace**:
A user-scoped invalidation scope (`itemsCache`, `tagsCache`) owning its tag string and one-level cascades. Reads declare deps via `cacheTag(namespace.tagFor(userId))`; writes invalidate via the action runner's `invalidates: [namespace]` list.

**Action runner**:
The single module (`lib/actions.ts`) that owns the server-action contract — `requireUser`, parse, service call, null→not-found, cache invalidation, envelope shaping. Actions are declared via `defineAction({ schema, invalidates, service, map })`.

**Swap point**:
A re-export boundary where an interface-stable component can be substituted without consumer changes. Today only one: `features/learning-items/components/notes-editor/index.tsx` (Tiptap today, AI tomorrow).

**Autosave field**:
A per-input controller used by the **LearningItem** inline editor. One `useAutosaveField<T>` hook per input coordinates debounce / commit / revert and reports into the surrounding `SaveStateProvider`. The `commitOn` trigger selects timing (`{ on: 'debounce', ms }` for text/number, `{ on: 'change' }` for selects, `{ on: 'manual' }` for the progress slider which commits on release).
_Avoid_: field component (describes the leaf JSX), autosave widget.

**Tag mutation controller**:
A hook (`useTagMutations`) that wraps every **Tag** server action with one shared `useTransition` and the toast surface. Views call `create / rename / remove / attach / detach / createAndAttach` and stay layout-only; the controller owns the action → toast pipeline. Default success messages are overridable via `opts.successMessage`.
_Avoid_: tag service hook (service is server-side), tag mutator.

## Relationships

- A **LearningItem** has exactly one **Type**, exactly one **Status**, and any number of **Tag**s.
- A **Tag** belongs to exactly one user; **LearningItem**s and **Tag**s are linked via `LearningItemTag`.
- A **Lifecycle-affecting field** write fires a **Lifecycle intent**; a **Plain field** write does not.
- A **Cache namespace** can cascade to another **Cache namespace** (one level only): invalidating `tagsCache` also invalidates `itemsCache` because tag chips render on item rows.

## Example dialogue

> **Dev:** "If I change a **LearningItem**'s title and status in the same patch, what happens?"
> **Domain:** "You can't. Title is a **Plain field**; status is a **Lifecycle-affecting field**. They take different actions (`updateItemFieldsAction` vs `updateItemStatusAction`) because lifecycle assumes one axis is changing at a time."

> **Dev:** "Why does deleting a **Tag** revalidate the items cache?"
> **Domain:** "Because tag chips render inside item rows. The `tagsCache` namespace declares a cascade to `itemsCache` — when tags change, item renders are stale."

## Flagged ambiguities

- "item" — colloquially used for **LearningItem**. Always means **LearningItem** in this codebase.
- "edit" — until Phase 3, also referred to a dedicated `/items/[id]/edit` route. Post-Phase-3, all edits are inline; the word "edit" refers to the user action, not a route.
