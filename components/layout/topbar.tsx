"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/features/auth/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  userName: string;
  userEmail: string;
};

export function Topbar({ userName, userEmail }: Props) {
  const router = useRouter();

  const initials =
    userName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <header className="border-border flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Account menu" />}
        >
          <Avatar className="size-7">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-muted-foreground text-xs">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
