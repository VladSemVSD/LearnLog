"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { updateItemFieldsAction } from "../../server/actions";
import type { UpdateItemFieldsInput } from "../../schema";
import { useAutosaveField } from "./use-autosave-field";

type NumberField = "estimatedHours" | "actualHours";

function parseValue(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function stringifyValue(n: number | null): string {
  return n === null ? "" : String(n);
}

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
  const autosave = useAutosaveField<number | null>({
    initial: initialValue,
    commitOn: { on: "debounce", ms: 500 },
    save: (next) => {
      const patch = { [field]: next } as UpdateItemFieldsInput["patch"];
      return updateItemFieldsAction({ id: itemId, patch });
    },
    pickFieldError: (errs) => errs[field]?.[0],
  });

  // Raw string holds intermediate input states ("12.") that the parsed number can't represent.
  const [raw, setRaw] = useState<string>(stringifyValue(initialValue));

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setRaw(next);
    autosave.setValue(parseValue(next));
  }

  function onBlur() {
    void autosave.commit();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      const reverted = autosave.revert();
      setRaw(stringifyValue(reverted));
    }
  }

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
