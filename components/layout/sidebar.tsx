"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, ListTodo, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/items", label: "Items", icon: ListTodo },
  { href: "/tags", label: "Tags", icon: Tag },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border hidden w-56 shrink-0 border-r md:flex md:flex-col">
      <div className="border-border flex h-14 items-center gap-2 border-b px-4">
        <BookOpen className="size-5" />
        <span className="font-semibold">Learning Portal</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active && "bg-muted font-medium",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
