import {
  BookMarked,
  GraduationCap,
  Hammer,
  PlayCircle,
  Trophy,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ItemStatus, ItemType } from "@/lib/generated/prisma/enums";

export const TYPE_LABEL: Record<ItemType, string> = {
  [ItemType.PROJECT]: "Project",
  [ItemType.COURSE]: "Course",
  [ItemType.CERTIFICATION]: "Certification",
  [ItemType.VIDEO]: "Video",
  [ItemType.BOOK]: "Book",
  [ItemType.MISC]: "Misc",
};

export const TYPE_ICON: Record<ItemType, LucideIcon> = {
  [ItemType.PROJECT]: Hammer,
  [ItemType.COURSE]: GraduationCap,
  [ItemType.CERTIFICATION]: Trophy,
  [ItemType.VIDEO]: PlayCircle,
  [ItemType.BOOK]: BookMarked,
  [ItemType.MISC]: Sparkles,
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  [ItemStatus.BACKLOG]: "Backlog",
  [ItemStatus.PLANNED]: "Planned",
  [ItemStatus.IN_PROGRESS]: "In progress",
  [ItemStatus.PAUSED]: "Paused",
  [ItemStatus.COMPLETED]: "Completed",
  [ItemStatus.DROPPED]: "Dropped",
};

export const STATUS_COLOR: Record<ItemStatus, string> = {
  [ItemStatus.BACKLOG]: "bg-muted text-muted-foreground",
  [ItemStatus.PLANNED]: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  [ItemStatus.IN_PROGRESS]: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  [ItemStatus.PAUSED]: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  [ItemStatus.COMPLETED]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  [ItemStatus.DROPPED]: "bg-red-500/15 text-red-700 dark:text-red-300",
};
