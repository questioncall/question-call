import Link from "next/link";

import { LogoMark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSignInPath, getSignUpPath } from "@/lib/user-paths";

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
            <span className="headline truncate text-base font-semibold text-foreground">Question Hub</span>
            <span className="truncate text-[11px] text-muted-foreground">{portalLabel}</span>
          </span>
        </Link>

<div className="ml-auto flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
            <Link href="/courses">Courses</Link>
          </Button>
          <ThemeToggle />
          <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
            <Link href={getSignInPath()}>Sign in</Link>
          </Button>
          <Button asChild className="hidden md:inline-flex" size="sm" variant="outline">
            <Link href={getSignUpPath("STUDENT")}>Student signup</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={getSignUpPath("TEACHER")}>Teacher signup</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
