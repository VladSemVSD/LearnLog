"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { updateItemFieldsAction } from "../../server/actions";
import type { UpdateItemFieldsInput } from "../../schema";
import { useSaveState } from "./save-state-context";

const DEBOUNCE_MS = 500;

type NumberField = "estimatedHours" | "actualHours";

export function InlineNumber({
  itemId,
  field,
  initialValue,
  placeholder,
  min,
  step,
}: {
  itemId: string;
  field: NumberField;
  initialValue: number | null;
  placeholder?: string;
  min?: number;
  step?: number | string;
}) {
  const [raw, setRaw] = useState<string>(
    initialValue === null ? "" : String(initialValue),
  );
  const savedRef = useRef<number | null>(initialValue);
  const rawRef = useRef(raw);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();
  const { markSaving, markSaved, markError, registerFlush, setLastAttempt } =
    useSaveState();

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function parseValue(s: string): number | null {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function performSave(nextRaw: string): Promise<void> {
    const next = parseValue(nextRaw);
    if (next === savedRef.current) return Promise.resolve();
    clearTimer();
    const attempt = () =>
      new Promise<void>((resolve) => {
        startTransition(async () => {
          markSaving();
          const patch = { [field]: next } as UpdateItemFieldsInput["patch"];
          const result = await updateItemFieldsAction({
            id: itemId,
            patch,
          });
          if (result.ok) {
            savedRef.current = next;
            markSaved();
          } else {
            markError(
              result.fieldErrors?.[field]?.[0] ?? result.error,
            );
          }
          resolve();
        });
      });
    setLastAttempt(attempt);
    return attempt();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setRaw(next);
    rawRef.current = next;
    clearTimer();
    timerRef.current = setTimeout(() => {
      void performSave(next);
    }, DEBOUNCE_MS);
  }

  function onBlur() {
    void performSave(rawRef.current);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      const reverted =
        savedRef.current === null ? "" : String(savedRef.current);
      setRaw(reverted);
      rawRef.current = reverted;
      clearTimer();
    }
  }

  useEffect(() => {
    return registerFlush(async () => {
      if (parseValue(rawRef.current) !== savedRef.current) {
        await performSave(rawRef.current);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimer(), []);

  return (
    <Input
      type="number"
      value={raw}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      min={min}
      step={step}
    />
  );
}
