import { describe, expect, it } from "vitest";
import { ItemStatus } from "@/lib/generated/prisma/enums";
import {
  applyLifecycleIntent,
  type CurrentLifecycle,
} from "./lifecycle";

const NOW = new Date("2026-01-15T10:00:00Z");

function baseline(
  overrides: Partial<CurrentLifecycle> = {},
): CurrentLifecycle {
  return {
    status: ItemStatus.BACKLOG,
    startedAt: null,
    completedAt: null,
    progressPercent: 0,
    ...overrides,
  };
}

describe("applyLifecycleIntent — create", () => {
  it("BACKLOG + progress=0 -> no timestamps, no auto-promotion", () => {
    const { patch, prompts } = applyLifecycleIntent(
      baseline(),
      { kind: "create", status: ItemStatus.BACKLOG, progressPercent: 0 },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.BACKLOG);
    expect(patch.startedAt).toBeNull();
    expect(patch.completedAt).toBeNull();
    expect(patch.progressPercent).toBe(0);
    expect(prompts).toEqual([]);
  });

  it("IN_PROGRESS at create stamps startedAt", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "create", status: ItemStatus.IN_PROGRESS, progressPercent: 0 },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.IN_PROGRESS);
    expect(patch.startedAt).toEqual(NOW);
    expect(patch.completedAt).toBeNull();
  });

  it("PAUSED at create stamps startedAt (you can't pause without starting)", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "create", status: ItemStatus.PAUSED, progressPercent: 0 },
      NOW,
    );
    expect(patch.startedAt).toEqual(NOW);
  });

  it("COMPLETED at create forces progress=100, both timestamps", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "create", status: ItemStatus.COMPLETED, progressPercent: 0 },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.COMPLETED);
    expect(patch.progressPercent).toBe(100);
    expect(patch.startedAt).toEqual(NOW);
    expect(patch.completedAt).toEqual(NOW);
  });

  it("BACKLOG + progress > 0 auto-promotes to IN_PROGRESS with startedAt", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "create", status: ItemStatus.BACKLOG, progressPercent: 30 },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.IN_PROGRESS);
    expect(patch.startedAt).toEqual(NOW);
    expect(patch.progressPercent).toBe(30);
  });

  it("PLANNED + progress > 0 auto-promotes too", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "create", status: ItemStatus.PLANNED, progressPercent: 10 },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.IN_PROGRESS);
    expect(patch.startedAt).toEqual(NOW);
  });
});

describe("applyLifecycleIntent — setStatus", () => {
  it("no-op when same status", () => {
    const { patch, prompts } = applyLifecycleIntent(
      baseline({ status: ItemStatus.IN_PROGRESS }),
      { kind: "setStatus", to: ItemStatus.IN_PROGRESS },
      NOW,
    );
    expect(patch).toEqual({});
    expect(prompts).toEqual([]);
  });

  it("BACKLOG -> IN_PROGRESS stamps startedAt", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "setStatus", to: ItemStatus.IN_PROGRESS },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.IN_PROGRESS);
    expect(patch.startedAt).toEqual(NOW);
  });

  it("IN_PROGRESS -> COMPLETED forces progress=100 and stamps completedAt", () => {
    const { patch } = applyLifecycleIntent(
      baseline({
        status: ItemStatus.IN_PROGRESS,
        startedAt: new Date("2026-01-10T00:00:00Z"),
        progressPercent: 50,
      }),
      { kind: "setStatus", to: ItemStatus.COMPLETED },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.COMPLETED);
    expect(patch.progressPercent).toBe(100);
    expect(patch.completedAt).toEqual(NOW);
    // startedAt is already set; not overwritten.
    expect(patch.startedAt).toBeUndefined();
  });

  it("BACKLOG -> COMPLETED stamps both timestamps", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "setStatus", to: ItemStatus.COMPLETED },
      NOW,
    );
    expect(patch.startedAt).toEqual(NOW);
    expect(patch.completedAt).toEqual(NOW);
    expect(patch.progressPercent).toBe(100);
  });

  it("COMPLETED -> IN_PROGRESS clears completedAt; progress preserved", () => {
    const { patch } = applyLifecycleIntent(
      baseline({
        status: ItemStatus.COMPLETED,
        startedAt: new Date("2026-01-01T00:00:00Z"),
        completedAt: new Date("2026-01-10T00:00:00Z"),
        progressPercent: 100,
      }),
      { kind: "setStatus", to: ItemStatus.IN_PROGRESS },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.IN_PROGRESS);
    expect(patch.completedAt).toBeNull();
    expect(patch.progressPercent).toBeUndefined();
  });

  it("entering IN_PROGRESS does NOT overwrite an existing startedAt", () => {
    const original = new Date("2026-01-01T00:00:00Z");
    const { patch } = applyLifecycleIntent(
      baseline({ status: ItemStatus.PAUSED, startedAt: original }),
      { kind: "setStatus", to: ItemStatus.IN_PROGRESS },
      NOW,
    );
    expect(patch.startedAt).toBeUndefined();
  });
});

describe("applyLifecycleIntent — setProgress", () => {
  it("no-op when same value", () => {
    const { patch, prompts } = applyLifecycleIntent(
      baseline({ progressPercent: 50, status: ItemStatus.IN_PROGRESS }),
      { kind: "setProgress", value: 50 },
      NOW,
    );
    expect(patch).toEqual({});
    expect(prompts).toEqual([]);
  });

  it("0 -> 50 on BACKLOG auto-promotes + stamps startedAt", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "setProgress", value: 50 },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.IN_PROGRESS);
    expect(patch.startedAt).toEqual(NOW);
    expect(patch.progressPercent).toBe(50);
  });

  it("0 -> 50 on PLANNED also auto-promotes", () => {
    const { patch } = applyLifecycleIntent(
      baseline({ status: ItemStatus.PLANNED }),
      { kind: "setProgress", value: 50 },
      NOW,
    );
    expect(patch.status).toBe(ItemStatus.IN_PROGRESS);
  });

  it("setProgress on IN_PROGRESS keeps status; no startedAt overwrite", () => {
    const started = new Date("2026-01-01T00:00:00Z");
    const { patch } = applyLifecycleIntent(
      baseline({
        status: ItemStatus.IN_PROGRESS,
        startedAt: started,
        progressPercent: 20,
      }),
      { kind: "setProgress", value: 60 },
      NOW,
    );
    expect(patch.progressPercent).toBe(60);
    expect(patch.status).toBeUndefined();
    expect(patch.startedAt).toBeUndefined();
  });

  it("hitting 100 on IN_PROGRESS emits confirm-complete prompt, does NOT auto-set status", () => {
    const { patch, prompts } = applyLifecycleIntent(
      baseline({
        status: ItemStatus.IN_PROGRESS,
        startedAt: new Date("2026-01-01T00:00:00Z"),
        progressPercent: 90,
      }),
      { kind: "setProgress", value: 100 },
      NOW,
    );
    expect(patch.progressPercent).toBe(100);
    expect(patch.status).toBeUndefined();
    expect(patch.completedAt).toBeUndefined();
    expect(prompts).toEqual(["confirm-complete"]);
  });

  it("hitting 100 on an already-COMPLETED item emits no prompt", () => {
    const { prompts } = applyLifecycleIntent(
      baseline({
        status: ItemStatus.COMPLETED,
        startedAt: new Date("2026-01-01T00:00:00Z"),
        completedAt: new Date("2026-01-10T00:00:00Z"),
        progressPercent: 100,
      }),
      { kind: "setProgress", value: 100 },
      NOW,
    );
    expect(prompts).toEqual([]);
  });

  it("dropping progress to 0 preserves status (no auto-demotion)", () => {
    const { patch } = applyLifecycleIntent(
      baseline({
        status: ItemStatus.IN_PROGRESS,
        startedAt: new Date("2026-01-01T00:00:00Z"),
        progressPercent: 60,
      }),
      { kind: "setProgress", value: 0 },
      NOW,
    );
    expect(patch.progressPercent).toBe(0);
    expect(patch.status).toBeUndefined();
  });

  it("BACKLOG + setProgress(0) does not promote (progress must be > 0)", () => {
    const { patch } = applyLifecycleIntent(
      baseline(),
      { kind: "setProgress", value: 0 },
      NOW,
    );
    // No change at all — no-op short-circuit fires.
    expect(patch).toEqual({});
  });
});
