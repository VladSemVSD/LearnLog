"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL, TYPE_LABEL } from "../constants";

type AvailableTag = { id: string; name: string };

const ALL = "__all__";
const SEARCH_DEBOUNCE_MS = 250;

export function ItemsFilters({
  availableTags,
}: {
  availableTags: AvailableTag[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);

  const type = params.get("type") ?? ALL;
  const status = params.get("status") ?? ALL;
  const tagId = params.get("tag") ?? ALL;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `/items?${qs}` : "/items", { scroll: false });
      });
    },
    [params, router],
  );

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => updateParam("q", value.trim()),
      SEARCH_DEBOUNCE_MS,
    );
  }

  const tagNameById = new Map(availableTags.map((t) => [t.id, t.name]));

  const hasActiveFilters =
    q.length > 0 ||
    type !== ALL ||
    status !== ALL ||
    tagId !== ALL;

  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQ("");
    startTransition(() => {
      router.replace("/items", { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Search by title…"
          className="pl-8"
        />
      </div>

      <Select
        value={type}
        onValueChange={(v) => updateParam("type", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue>
            {(v: string) =>
              !v || v === ALL ? "All types" : TYPE_LABEL[v as ItemType]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {(Object.keys(TYPE_LABEL) as ItemType[]).map((t) => (
            <SelectItem key={t} value={t}>
              {TYPE_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {(v: string) =>
              !v || v === ALL ? "All statuses" : STATUS_LABEL[v as ItemStatus]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={tagId}
        onValueChange={(v) => updateParam("tag", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {(v: string) =>
              !v || v === ALL ? "All tags" : tagNameById.get(v) ?? "All tags"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tags</SelectItem>
          {availableTags.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-3.5" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
