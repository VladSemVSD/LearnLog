"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateItemFieldsAction } from "../../server/actions";
import type { UpdateItemFieldsInput } from "../../schema";
import { useAutosaveField } from "./use-autosave-field";

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
  const autosave = useAutosaveField<string>({
    initial: initialValue,
    commitOn: { on: "debounce", ms: 500 },
    save: (next) => {
      const patchValue = nullableEmpty && next === "" ? null : next;
      const patch = { [field]: patchValue } as UpdateItemFieldsInput["patch"];
      return updateItemFieldsAction({ id: itemId, patch });
    },
    pickFieldError: (errs) => errs[field]?.[0],
  });

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    autosave.setValue(e.target.value);
  }

  function onBlur() {
    void autosave.commit();
  }

  function onKeyDown(
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (e.key === "Escape") autosave.revert();
  }

  if (multiline) {
    return (
      <Textarea
        value={autosave.value}
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
      value={autosave.value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(className)}
    />
  );
}
