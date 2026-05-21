"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateItemFieldsAction } from "../../server/actions";
import type { UpdateItemFieldsInput } from "../../schema";
import { useAutosaveField } from "./use-autosave-field";

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
  const autosave = useAutosaveField<string>({
    initial: initialValue,
    commitOn: { on: "change" },
    save: (next) =>
      updateItemFieldsAction({ id: itemId, patch: buildPatch(next) }),
  });

  return (
    <Select
      value={autosave.value}
      onValueChange={(next: string | null) => {
        if (next === null) return;
        autosave.setValue(next);
      }}
    >
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
