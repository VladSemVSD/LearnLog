"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateItemFieldsAction } from "../../server/actions";
import type { UpdateItemFieldsInput } from "../../schema";
import { useSaveState } from "./save-state-context";

type Option = { value: string; label: string };

export function InlineSelect({
  itemId,
  initialValue,
  options,
  buildPatch,
  placeholder,
  renderValue,
  triggerClassName,
}: {
  itemId: string;
  initialValue: string;
  options: Option[];
  // Caller owns the raw-string-to-patch coercion so we don't have to keep a
  // map of field-name to value-type inside this component.
  buildPatch: (raw: string) => UpdateItemFieldsInput["patch"];
  placeholder?: string;
  renderValue?: (raw: string) => string;
  triggerClassName?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [, startTransition] = useTransition();
  const { markSaving, markSaved, markError, setLastAttempt } = useSaveState();

  function onValueChange(next: string | null) {
    if (next === null || next === value) return;
    setValue(next);

    const attempt = () =>
      new Promise<void>((resolve) => {
        startTransition(async () => {
          markSaving();
          const result = await updateItemFieldsAction({
            id: itemId,
            patch: buildPatch(next),
          });
          if (result.ok) {
            markSaved();
          } else {
            markError(result.error);
          }
          resolve();
        });
      });
    setLastAttempt(attempt);
    void attempt();
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue>
          {(v: string) => {
            if (!v) return placeholder ?? "Select…";
            if (renderValue) return renderValue(v);
            return options.find((o) => o.value === v)?.label ?? v;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
