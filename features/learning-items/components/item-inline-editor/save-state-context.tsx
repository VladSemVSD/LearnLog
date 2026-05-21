"use client";

import {
  createContext,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type SaveState =
  | { kind: "idle"; lastSavedAt: Date | null }
  | { kind: "saving" }
  | { kind: "error"; message: string };

type FlushCallback = () => Promise<void>;
type Attempt = () => Promise<void>;

type SaveStateContextValue = {
  state: SaveState;
  markSaving: () => void;
  markSaved: () => void;
  markError: (message: string) => void;
  registerFlush: (cb: FlushCallback) => () => void;
  setLastAttempt: (fn: Attempt | null) => void;
  retry: () => Promise<void>;
};

const SaveStateContext = createContext<SaveStateContextValue | null>(null);

export function useSaveState(): SaveStateContextValue {
  const ctx = useContext(SaveStateContext);
  if (!ctx) {
    throw new Error("useSaveState must be used inside <SaveStateProvider>");
  }
  return ctx;
}

export type SaveStateProviderHandle = {
  flushAll: () => Promise<void>;
};

export function SaveStateProvider({
  children,
  ref,
}: {
  children: React.ReactNode;
  ref?: React.Ref<SaveStateProviderHandle>;
}) {
  const router = useRouter();
  const [state, setState] = useState<SaveState>({
    kind: "idle",
    lastSavedAt: null,
  });
  const flushersRef = useRef<Set<FlushCallback>>(new Set());
  const lastAttemptRef = useRef<Attempt | null>(null);

  const markSaving = useCallback(() => {
    setState({ kind: "saving" });
  }, []);

  // Bypasses staleTimes.dynamic so collapsed-row views (and any other render
  // of this item) refresh now instead of waiting 30s. See next.config.ts:21.
  const markSaved = useCallback(() => {
    setState({ kind: "idle", lastSavedAt: new Date() });
    lastAttemptRef.current = null;
    router.refresh();
  }, [router]);

  const markError = useCallback((message: string) => {
    setState({ kind: "error", message });
  }, []);

  const registerFlush = useCallback((cb: FlushCallback) => {
    flushersRef.current.add(cb);
    return () => {
      flushersRef.current.delete(cb);
    };
  }, []);

  const setLastAttempt = useCallback((fn: Attempt | null) => {
    lastAttemptRef.current = fn;
  }, []);

  const retry = useCallback(async () => {
    const fn = lastAttemptRef.current;
    if (!fn) return;
    await fn();
  }, []);

  const flushAll = useCallback(async () => {
    const callbacks = Array.from(flushersRef.current);
    await Promise.all(callbacks.map((cb) => cb()));
  }, []);

  useImperativeHandle(ref, () => ({ flushAll }), [flushAll]);

  const value: SaveStateContextValue = {
    state,
    markSaving,
    markSaved,
    markError,
    registerFlush,
    setLastAttempt,
    retry,
  };

  return (
    <SaveStateContext.Provider value={value}>
      {children}
    </SaveStateContext.Provider>
  );
}
