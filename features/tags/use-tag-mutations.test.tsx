// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ActionResult } from "@/lib/actions";

const actions = vi.hoisted(() => ({
  createTagAction: vi.fn(),
  updateTagAction: vi.fn(),
  deleteTagAction: vi.fn(),
  attachTagAction: vi.fn(),
  detachTagAction: vi.fn(),
}));

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("./server/actions", () => actions);
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: toast.success,
    error: toast.error,
  }),
}));

import { useTagMutations } from "./use-tag-mutations";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err(error: string): ActionResult<never> {
  return { ok: false, error };
}

beforeEach(() => {
  actions.createTagAction.mockReset();
  actions.updateTagAction.mockReset();
  actions.deleteTagAction.mockReset();
  actions.attachTagAction.mockReset();
  actions.detachTagAction.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTagMutations — create", () => {
  it("fires the default success toast on ok", async () => {
    actions.createTagAction.mockResolvedValue(ok({ id: "1", name: "python" }));
    const { result } = renderHook(() => useTagMutations());

    let returned: ActionResult<{ id: string; name: string }> | undefined;
    await act(async () => {
      returned = await result.current.create({ name: "python", color: null });
    });

    expect(actions.createTagAction).toHaveBeenCalledWith({
      name: "python",
      color: null,
    });
    expect(toast.success).toHaveBeenCalledWith('Tag "python" created');
    expect(toast.error).not.toHaveBeenCalled();
    expect(returned?.ok).toBe(true);
  });

  it("uses successMessage override (string or function)", async () => {
    actions.createTagAction.mockResolvedValue(ok({ id: "1", name: "python" }));
    const { result } = renderHook(() => useTagMutations());

    await act(async () => {
      await result.current.create(
        { name: "python", color: null },
        { successMessage: "Added it" },
      );
    });
    expect(toast.success).toHaveBeenCalledWith("Added it");

    toast.success.mockReset();

    await act(async () => {
      await result.current.create(
        { name: "rust", color: null },
        { successMessage: (tag) => `+${tag.name}` },
      );
    });
    expect(toast.success).toHaveBeenCalledWith("+python");
  });

  it("fires the error toast and returns the failure on action error", async () => {
    actions.createTagAction.mockResolvedValue(err("A tag with that name already exists."));
    const { result } = renderHook(() => useTagMutations());

    let returned: ActionResult<{ id: string; name: string }> | undefined;
    await act(async () => {
      returned = await result.current.create({ name: "python", color: null });
    });

    expect(toast.error).toHaveBeenCalledWith(
      "A tag with that name already exists.",
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(returned?.ok).toBe(false);
  });
});

describe("useTagMutations — remove", () => {
  it("default success message includes the tag name from the input", async () => {
    actions.deleteTagAction.mockResolvedValue(ok({ id: "1" }));
    const { result } = renderHook(() => useTagMutations());

    await act(async () => {
      await result.current.remove({ id: "1", name: "python" });
    });

    expect(actions.deleteTagAction).toHaveBeenCalledWith({ id: "1" });
    expect(toast.success).toHaveBeenCalledWith('Tag "python" deleted');
  });
});

describe("useTagMutations — attach / detach", () => {
  it("does not toast on success (silent), only on failure", async () => {
    actions.attachTagAction.mockResolvedValue(ok({}));
    const { result } = renderHook(() => useTagMutations());

    await act(async () => {
      await result.current.attach({ itemId: "i1", tagId: "t1" });
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    actions.attachTagAction.mockResolvedValue(err("Already attached"));
    await act(async () => {
      await result.current.attach({ itemId: "i1", tagId: "t1" });
    });
    expect(toast.error).toHaveBeenCalledWith("Already attached");
  });
});

describe("useTagMutations — createAndAttach", () => {
  it("chains create -> attach and fires one success toast", async () => {
    actions.createTagAction.mockResolvedValue(ok({ id: "1", name: "rust" }));
    actions.attachTagAction.mockResolvedValue(ok({}));
    const { result } = renderHook(() => useTagMutations());

    let returned: ActionResult<{ id: string; name: string }> | undefined;
    await act(async () => {
      returned = await result.current.createAndAttach({
        itemId: "i1",
        name: "rust",
        color: null,
      });
    });

    expect(actions.createTagAction).toHaveBeenCalledWith({
      name: "rust",
      color: null,
    });
    expect(actions.attachTagAction).toHaveBeenCalledWith({
      itemId: "i1",
      tagId: "1",
    });
    expect(toast.success).toHaveBeenCalledWith('Added "rust"');
    expect(returned?.ok).toBe(true);
  });

  it("on create failure, does not attach and surfaces the create error", async () => {
    actions.createTagAction.mockResolvedValue(err("Name conflict"));
    const { result } = renderHook(() => useTagMutations());

    await act(async () => {
      await result.current.createAndAttach({
        itemId: "i1",
        name: "x",
        color: null,
      });
    });

    expect(actions.attachTagAction).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Name conflict");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("on attach failure after create, surfaces the attach error but keeps the created tag", async () => {
    actions.createTagAction.mockResolvedValue(ok({ id: "1", name: "rust" }));
    actions.attachTagAction.mockResolvedValue(err("Attach failed"));
    const { result } = renderHook(() => useTagMutations());

    let returned: ActionResult<{ id: string; name: string }> | undefined;
    await act(async () => {
      returned = await result.current.createAndAttach({
        itemId: "i1",
        name: "rust",
        color: null,
      });
    });

    expect(toast.error).toHaveBeenCalledWith("Attach failed");
    expect(returned?.ok).toBe(true); // create result returned
    if (returned?.ok) {
      expect(returned.data.id).toBe("1");
    }
  });
});
