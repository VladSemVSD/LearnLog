"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ActionResult } from "@/lib/actions";
import { useSaveState } from "./save-state-context";

export type CommitTrigger =
  | { on: "debounce"; ms: number }
  | { on: "change" }
  | { on: "manual" };

export type AutosaveOptions<T> = {
  initial: T;
  commitOn: CommitTrigger;
  isEqual?: (a: T, b: T) => boolean;
  save: (value: T) => Promise<ActionResult<unknown>>;
  pickFieldError?: (
    fieldErrors: Record<string, string[]>,
  ) => string | undefined;
  revertOnError?: boolean;
};

export type AutosaveField<T> = {
  value: T;
  setValue: (next: T) => void;
  commit: () => Promise<void>;
  revert: () => T;
};

function defaultIsEqual<T>(a: T, b: T): boolean {
  return Object.is(a, b);
}

export function useAutosaveField<T>(
  opts: AutosaveOptions<T>,
): AutosaveField<T> {
  const [value, setValueState] = useState<T>(opts.initial);
  const savedRef = useRef<T>(opts.initial);
  const valueRef = useRef<T>(opts.initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();
  const { markSaving, markSaved, markError, registerFlush, setLastAttempt } =
    useSaveState();

  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const performSave = useCallback(
    (next: T): Promise<void> => {
      const isEqual = optsRef.current.isEqual ?? defaultIsEqual;
      if (isEqual(next, savedRef.current)) return Promise.resolve();
      clearTimer();
      const attempt = () =>
        new Promise<void>((resolve) => {
          startTransition(async () => {
            markSaving();
            const result = await optsRef.current.save(next);
            if (result.ok) {
              savedRef.current = next;
              markSaved();
            } else {
              const fieldMsg = result.fieldErrors
                ? optsRef.current.pickFieldError?.(result.fieldErrors)
                : undefined;
              markError(fieldMsg ?? result.error);
              if (optsRef.current.revertOnError) {
                valueRef.current = savedRef.current;
                setValueState(savedRef.current);
              }
            }
            resolve();
          });
        });
      setLastAttempt(attempt);
      return attempt();
    },
    [clearTimer, markError, markSaved, markSaving, setLastAttempt],
  );

  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      valueRef.current = next;
      clearTimer();
      const trigger = optsRef.current.commitOn;
      if (trigger.on === "debounce") {
        timerRef.current = setTimeout(() => {
          void performSave(next);
        }, trigger.ms);
      } else if (trigger.on === "change") {
        void performSave(next);
      }
    },
    [clearTimer, performSave],
  );

  const commit = useCallback(
    () => performSave(valueRef.current),
    [performSave],
  );

  const revert = useCallback((): T => {
    clearTimer();
    const reverted = savedRef.current;
    valueRef.current = reverted;
    setValueState(reverted);
    return reverted;
  }, [clearTimer]);

  useEffect(() => {
    return registerFlush(async () => {
      const isEqual = optsRef.current.isEqual ?? defaultIsEqual;
      if (!isEqual(valueRef.current, savedRef.current)) {
        await performSave(valueRef.current);
      }
    });
  }, [performSave, registerFlush]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { value, setValue, commit, revert };
}
