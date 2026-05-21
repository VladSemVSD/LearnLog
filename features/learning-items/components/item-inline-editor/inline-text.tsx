"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateItemFieldsAction } from "../../server/actions";
import type { UpdateItemFieldsInput } from "../../schema";
import { useSaveState } from "./save-state-context";

const DEBOUNCE_MS = 500;

type StringField = "title" | "description" | "sourceUrl";

export function InlineText({
  itemId,
  field,
  initialValue,
  placeholder,
  multiline = false,
  rows,
  className,
  inputType,
  nullableEmpty = false,
}: {
  itemId: string;
  field: StringField;
  initialValue: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputType?: "text" | "url";
  // When true, an empty string saves as null instead of "" (used for description, sourceUrl).
  nullableEmpty?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const savedRef = useRef(initialValue);
  const valueRef = useRef(initialValue);
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

  function performSave(next: string): Promise<void> {
    if (next === savedRef.current) return Promise.resolve();
    clearTimer();
    const attempt = () =>
      new Promise<void>((resolve) => {
        startTransition(async () => {
          markSaving();
          const patchValue =
            nullableEmpty && next === "" ? null : next;
          const patch = {
            [field]: patchValue,
          } as UpdateItemFieldsInput["patch"];
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

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const next = e.target.value;
    setValue(next);
    valueRef.current = next;
    clearTimer();
    timerRef.current = setTimeout(() => {
      void performSave(next);
    }, DEBOUNCE_MS);
  }

  function onBlur() {
    void performSave(valueRef.current);
  }

  function onKeyDown(
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (e.key === "Escape") {
      setValue(savedRef.current);
      valueRef.current = savedRef.current;
      clearTimer();
    }
  }

  useEffect(() => {
    return registerFlush(async () => {
      if (valueRef.current !== savedRef.current) {
        await performSave(valueRef.current);
      }
    });
    // performSave is stable per (itemId, field); deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimer(), []);

  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows ?? 3}
        className={className}
      />
    );
  }

  return (
    <Input
      type={inputType ?? "text"}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(className)}
    />
  );
}
