/**
 * Item lifecycle — the single source of truth for how a LearningItem's status
 * and its dependent fields (`startedAt`, `completedAt`, `progressPercent`)
 * change together.
 *
 * Every write to a LearningItem goes through `applyLifecycleIntent`. Service
 * functions hand it the current lifecycle slice and a tagged intent; they
 * persist whatever `patch` it returns and bubble `prompts` to the UI.
 *
 * Pure. No I/O. Time is injected via `now` for testability (default = new Date()).
 */

import { ItemStatus } from "@/lib/generated/prisma/enums";

export type ItemStatusValue = ItemStatus;

export type CurrentLifecycle = {
  status: ItemStatusValue;
  startedAt: Date | null;
  completedAt: Date | null;
  progressPercent: number;
};

export type LifecycleIntent =
  | { kind: "create"; status: ItemStatusValue; progressPercent: number }
  | { kind: "setStatus"; to: ItemStatusValue }
  | { kind: "setProgress"; value: number };

export type LifecyclePatch = {
  status?: ItemStatusValue;
  startedAt?: Date | null;
  completedAt?: Date | null;
  progressPercent?: number;
};

/** UI hints bubbled to the caller. The patch is applied regardless. */
export type LifecyclePrompt = "confirm-complete";

export type LifecycleResult = {
  patch: LifecyclePatch;
  prompts: LifecyclePrompt[];
};

const NOT_YET_STARTED: ItemStatusValue[] = [
  ItemStatus.BACKLOG,
  ItemStatus.PLANNED,
];

function isNotYetStarted(status: ItemStatusValue): boolean {
  return NOT_YET_STARTED.includes(status);
}

export function applyLifecycleIntent(
  current: CurrentLifecycle,
  intent: LifecycleIntent,
  now: Date = new Date(),
): LifecycleResult {
  switch (intent.kind) {
    case "create":
      return forCreate(intent.status, intent.progressPercent, now);
    case "setStatus":
      return forSetStatus(current, intent.to, now);
    case "setProgress":
      return forSetProgress(current, intent.value, now);
  }
}

function forCreate(
  initialStatus: ItemStatusValue,
  initialProgress: number,
  now: Date,
): LifecycleResult {
  const patch: LifecyclePatch = {
    status: initialStatus,
    progressPercent: initialProgress,
    startedAt: null,
    completedAt: null,
  };

  // Auto-promote: progress > 0 with a not-yet-started status -> IN_PROGRESS.
  if (initialProgress > 0 && isNotYetStarted(initialStatus)) {
    patch.status = ItemStatus.IN_PROGRESS;
  }

  // Side-field rules derived from the final status.
  const finalStatus = patch.status ?? initialStatus;

  if (
    finalStatus === ItemStatus.IN_PROGRESS ||
    finalStatus === ItemStatus.PAUSED
  ) {
    patch.startedAt = now;
  }

  if (finalStatus === ItemStatus.COMPLETED) {
    patch.startedAt = now;
    patch.completedAt = now;
    patch.progressPercent = 100;
  }

  return { patch, prompts: [] };
}

function forSetStatus(
  current: CurrentLifecycle,
  to: ItemStatusValue,
  now: Date,
): LifecycleResult {
  if (current.status === to) {
    return { patch: {}, prompts: [] };
  }

  const patch: LifecyclePatch = { status: to };

  // Entering IN_PROGRESS for the first time -> stamp startedAt.
  if (to === ItemStatus.IN_PROGRESS && current.startedAt === null) {
    patch.startedAt = now;
  }

  // Entering COMPLETED -> force progress = 100 and stamp completedAt.
  if (to === ItemStatus.COMPLETED) {
    patch.progressPercent = 100;
    patch.completedAt = now;
    if (current.startedAt === null) patch.startedAt = now;
  }

  // Leaving COMPLETED -> clear completedAt (progress preserved).
  if (current.status === ItemStatus.COMPLETED && to !== ItemStatus.COMPLETED) {
    patch.completedAt = null;
  }

  return { patch, prompts: [] };
}

function forSetProgress(
  current: CurrentLifecycle,
  value: number,
  now: Date,
): LifecycleResult {
  if (current.progressPercent === value) {
    return { patch: {}, prompts: [] };
  }

  const patch: LifecyclePatch = { progressPercent: value };
  const prompts: LifecyclePrompt[] = [];

  // Auto-promote: progress > 0 with a not-yet-started status -> IN_PROGRESS.
  if (value > 0 && isNotYetStarted(current.status)) {
    patch.status = ItemStatus.IN_PROGRESS;
    if (current.startedAt === null) patch.startedAt = now;
  }

  // Reaching 100% on a non-completed item -> bubble a UI prompt, no auto-set.
  if (value >= 100 && current.status !== ItemStatus.COMPLETED) {
    prompts.push("confirm-complete");
  }

  return { patch, prompts };
}
