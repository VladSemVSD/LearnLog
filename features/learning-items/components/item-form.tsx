"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";
import { createItemSchema } from "../schema";

type ItemFormValues = z.input<typeof createItemSchema>;
import {
  STATUS_LABEL,
  TYPE_LABEL,
} from "../constants";
import {
  createItemAction,
  updateItemAction,
} from "../server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ItemFormProps =
  | { mode: "create"; defaultValues?: Partial<ItemFormValues> }
  | {
      mode: "edit";
      itemId: string;
      defaultValues: Partial<ItemFormValues> & { title: string; type: ItemType };
    };

const PRIORITY_OPTIONS = [
  { value: 0, label: "0 — None" },
  { value: 1, label: "1 — Low" },
  { value: 2, label: "2 — Medium" },
  { value: 3, label: "3 — High" },
];

export function ItemForm(props: ItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(createItemSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      type: ItemType.PROJECT,
      status: ItemStatus.BACKLOG,
      priority: 0,
      progressPercent: 0,
      estimatedHours: null,
      actualHours: null,
      sourceUrl: "",
      notes: "",
      tagIds: [],
      ...props.defaultValues,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = form;

  function applyFieldErrors(fieldErrors: Record<string, string[]> | undefined) {
    if (!fieldErrors) return;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages.length === 0) continue;
      setError(field as keyof ItemFormValues, { message: messages.join(", ") });
    }
  }

  function onSubmit(values: ItemFormValues) {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createItemAction(values)
          : await updateItemAction({ id: props.itemId, ...values });

      if (!result.ok) {
        applyFieldErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(props.mode === "create" ? "Item created" : "Item updated");
      router.push(`/items/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Field label="Title" error={errors.title?.message}>
        <Input
          {...register("title")}
          placeholder="e.g., Build a personal CRM"
          autoFocus
        />
      </Field>

      <Field label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          placeholder="Short summary of what this is."
          rows={3}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Type" error={errors.type?.message}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) =>
                      v ? TYPE_LABEL[v as ItemType] : "Select type"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as ItemType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) =>
                      v ? STATUS_LABEL[v as ItemStatus] : "Select status"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Priority" error={errors.priority?.message}>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select
                value={String(field.value ?? 0)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) =>
                      PRIORITY_OPTIONS.find((o) => String(o.value) === v)
                        ?.label ?? "Priority"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Estimated hours" error={errors.estimatedHours?.message}>
          <Input
            type="number"
            min={0}
            step="0.5"
            {...register("estimatedHours", {
              setValueAs: (v) =>
                v === "" || v === null || v === undefined ? null : Number(v),
            })}
            placeholder="e.g., 8"
          />
        </Field>
      </div>

      <Field label="Source URL" error={errors.sourceUrl?.message}>
        <Input
          type="url"
          {...register("sourceUrl")}
          placeholder="https://…"
        />
      </Field>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving…"
            : props.mode === "create"
              ? "Create item"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
