"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions";
import {
  attachTagAction,
  createTagAction,
  deleteTagAction,
  detachTagAction,
  updateTagAction,
} from "./server/actions";

type CreatedTag = { id: string; name: string };
type IdRef = { id: string };

type SuccessMessage<T> = string | ((data: T) => string);
type MutationOpts<T> = { successMessage?: SuccessMessage<T> };

function resolveMessage<T>(
  msg: SuccessMessage<T> | undefined,
  data: T,
  fallback: string,
): string {
  if (msg === undefined) return fallback;
  return typeof msg === "function" ? msg(data) : msg;
}

export type UseTagMutations = {
  create: (
    input: { name: string; color: string | null },
    opts?: MutationOpts<CreatedTag>,
  ) => Promise<ActionResult<CreatedTag>>;
  rename: (
    input: { id: string; name: string; color: string | null },
    opts?: MutationOpts<IdRef>,
  ) => Promise<ActionResult<IdRef>>;
  remove: (
    input: { id: string; name: string },
    opts?: MutationOpts<IdRef>,
  ) => Promise<ActionResult<IdRef>>;
  attach: (input: {
    itemId: string;
    tagId: string;
  }) => Promise<ActionResult<unknown>>;
  detach: (input: {
    itemId: string;
    tagId: string;
  }) => Promise<ActionResult<unknown>>;
  createAndAttach: (
    input: { itemId: string; name: string; color: string | null },
    opts?: MutationOpts<CreatedTag>,
  ) => Promise<ActionResult<CreatedTag>>;
  isPending: boolean;
};

export function useTagMutations(): UseTagMutations {
  const [isPending, startTransition] = useTransition();

  const create = useCallback<UseTagMutations["create"]>((input, opts) => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await createTagAction(input);
        if (result.ok) {
          toast.success(
            resolveMessage(
              opts?.successMessage,
              result.data,
              `Tag "${result.data.name}" created`,
            ),
          );
        } else {
          toast.error(result.error);
        }
        resolve(result);
      });
    });
  }, []);

  const rename = useCallback<UseTagMutations["rename"]>((input, opts) => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await updateTagAction(input);
        if (result.ok) {
          toast.success(
            resolveMessage(opts?.successMessage, result.data, "Tag updated"),
          );
        } else {
          toast.error(result.error);
        }
        resolve(result);
      });
    });
  }, []);

  const remove = useCallback<UseTagMutations["remove"]>((input, opts) => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await deleteTagAction({ id: input.id });
        if (result.ok) {
          toast.success(
            resolveMessage(
              opts?.successMessage,
              result.data,
              `Tag "${input.name}" deleted`,
            ),
          );
        } else {
          toast.error(result.error);
        }
        resolve(result);
      });
    });
  }, []);

  const attach = useCallback<UseTagMutations["attach"]>((input) => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await attachTagAction(input);
        if (!result.ok) toast.error(result.error);
        resolve(result);
      });
    });
  }, []);

  const detach = useCallback<UseTagMutations["detach"]>((input) => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await detachTagAction(input);
        if (!result.ok) toast.error(result.error);
        resolve(result);
      });
    });
  }, []);

  const createAndAttach = useCallback<UseTagMutations["createAndAttach"]>(
    (input, opts) => {
      return new Promise((resolve) => {
        startTransition(async () => {
          const created = await createTagAction({
            name: input.name,
            color: input.color,
          });
          if (!created.ok) {
            toast.error(created.error);
            resolve(created);
            return;
          }
          const attached = await attachTagAction({
            itemId: input.itemId,
            tagId: created.data.id,
          });
          if (!attached.ok) {
            toast.error(attached.error);
            // Tag was created but not attached. Surface created so callers can
            // keep going (e.g. clear inputs); the toast already fired.
            resolve(created);
            return;
          }
          toast.success(
            resolveMessage(
              opts?.successMessage,
              created.data,
              `Added "${created.data.name}"`,
            ),
          );
          resolve(created);
        });
      });
    },
    [],
  );

  return {
    create,
    rename,
    remove,
    attach,
    detach,
    createAndAttach,
    isPending,
  };
}
