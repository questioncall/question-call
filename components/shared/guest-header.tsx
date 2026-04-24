"use client";

import Link from "next/link";
import { MoreVertical, SunIcon } from "lucide-react";

import { LogoMark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSignInPath, getSignUpPath } from "@/lib/user-paths";
import { APP_NAME } from "@/lib/constants";

type GuestHeaderProps = {
  portalLabel?: string;
};

export function GuestHeader({ portalLabel = "Students • Teachers • Public" }: GuestHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <LogoMark size={36} className="rounded-2xl" />
          <span className="flex min-w-0 flex-col">
            <span className="headline truncate text-base font-semibold text-foreground">{APP_NAME}</span>
            <span className="truncate text-[11px] text-muted-foreground">{portalLabel}</span>
          </span>
        </Link>

        {/* Desktop: Show all items */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          <Button asChild className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" size="sm" variant="outline">
            <Link href="/courses">Courses</Link>
          </Button>
          <ThemeToggle />
          <Button asChild size="sm" variant="ghost">
            <Link href={getSignInPath()}>Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={getSignUpPath("STUDENT")}>Student signup</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={getSignUpPath("TEACHER")}>Teacher signup</Link>
          </Button>
        </div>

        {/* Mobile: Show 3-dot menu */}
        <div className="ml-auto flex md:hidden items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="size-9">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/courses">Courses</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); }}>
                <ThemeToggle />
                <span className="ml-2">Dark mode</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={getSignInPath()}>Sign in</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={getSignUpPath("STUDENT")}>Student signup</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={getSignUpPath("TEACHER")}>Teacher signup</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}