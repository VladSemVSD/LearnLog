// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  SaveStateProvider,
  useSaveState,
  type SaveStateProviderHandle,
} from "./save-state-context";
import {
  useAutosaveField,
  type AutosaveOptions,
} from "./use-autosave-field";
import type { ActionResult } from "@/lib/actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return fieldErrors
    ? { ok: false, error, fieldErrors }
    : { ok: false, error };
}

function setup<T>(opts: AutosaveOptions<T>) {
  const handleRef = createRef<SaveStateProviderHandle>();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SaveStateProvider ref={handleRef}>{children}</SaveStateProvider>
  );
  const { result } = renderHook(
    () => ({ field: useAutosaveField(opts), state: useSaveState() }),
    { wrapper },
  );
  return { result, handleRef };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAutosaveField — debounce", () => {
  it("coalesces rapid setValue calls into one save with the latest value", async () => {
    const save = vi.fn(async () => ok({}));
    const { result } = setup<string>({
      initial: "",
      commitOn: { on: "debounce", ms: 500 },
      save,
    });

    act(() => {
      result.current.field.setValue("a");
      result.current.field.setValue("ab");
      result.current.field.setValue("abc");
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abc");
  });

  it("skips the save when the new value equals the saved value", async () => {
    const save = vi.fn(async () => ok({}));
    const { result } = setup<string>({
      initial: "hello",
      commitOn: { on: "debounce", ms: 500 },
      save,
    });

    act(() => {
      result.current.field.setValue("hello");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(save).not.toHaveBeenCalled();
  });
});

describe("useAutosaveField — commit / revert", () => {
  it("commit() flushes a pending debounce immediately", async () => {
    const save = vi.fn(async () => ok({}));
    const { result } = setup<string>({
      initial: "",
      commitOn: { on: "debounce", ms: 500 },
      save,
    });

    act(() => {
      result.current.field.setValue("draft");
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.field.commit();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("draft");
  });

  it("revert() clears pending debounce, returns saved value, and snaps state back", async () => {
    const save = vi.fn(async () => ok({}));
    const { result } = setup<string>({
      initial: "saved",
      commitOn: { on: "debounce", ms: 500 },
      save,
    });

    let reverted: string | undefined;
    act(() => {
      result.current.field.setValue("dirty");
    });
    expect(result.current.field.value).toBe("dirty");

    act(() => {
      reverted = result.current.field.revert();
    });
    expect(reverted).toBe("saved");
    expect(result.current.field.value).toBe("saved");

    // The pending debounce should never fire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("useAutosaveField — save-state reporting", () => {
  it("on success, advances saved baseline so a subsequent setValue with the same value is a no-op", async () => {
    const save = vi.fn(async () => ok({}));
    const { result } = setup<string>({
      initial: "",
      commitOn: { on: "change" },
      save,
    });

    await act(async () => {
      result.current.field.setValue("first");
    });
    expect(save).toHaveBeenCalledTimes(1);

    // Same value -> dedupe
    await act(async () => {
      result.current.field.setValue("first");
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("on failure with fieldErrors, surfaces the picked field error message", async () => {
    const save = vi.fn(async () =>
      err("Generic error", { title: ["Title too short"] }),
    );
    const { result } = setup<string>({
      initial: "",
      commitOn: { on: "change" },
      save,
      pickFieldError: (errs) => errs.title?.[0],
    });

    await act(async () => {
      result.current.field.setValue("x");
    });

    expect(result.current.state.state).toEqual({
      kind: "error",
      message: "Title too short",
    });
  });

  it("revertOnError: true snaps value back; default (false) keeps the user's value", async () => {
    const save = vi.fn(async () => err("Nope"));

    // Default: keep value
    const a = setup<string>({
      initial: "saved",
      commitOn: { on: "change" },
      save,
    });
    await act(async () => {
      a.result.current.field.setValue("attempt");
    });
    expect(a.result.current.field.value).toBe("attempt");

    // revertOnError: snap back
    const b = setup<string>({
      initial: "saved",
      commitOn: { on: "change" },
      save,
      revertOnError: true,
    });
    await act(async () => {
      b.result.current.field.setValue("attempt");
    });
    expect(b.result.current.field.value).toBe("saved");
  });
});

describe("useAutosaveField — flush registration", () => {
  it("provider.flushAll() commits the pending dirty value", async () => {
    const save = vi.fn(async () => ok({}));
    const { result, handleRef } = setup<string>({
      initial: "",
      commitOn: { on: "debounce", ms: 500 },
      save,
    });

    act(() => {
      result.current.field.setValue("typed");
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await handleRef.current?.flushAll();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("typed");
  });

  it("provider.flushAll() does nothing when no field is dirty", async () => {
    const save = vi.fn(async () => ok({}));
    const { handleRef } = setup<string>({
      initial: "clean",
      commitOn: { on: "debounce", ms: 500 },
      save,
    });

    await act(async () => {
      await handleRef.current?.flushAll();
    });

    expect(save).not.toHaveBeenCalled();
  });
});
