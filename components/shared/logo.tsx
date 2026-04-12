import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  compact?: boolean;
  href?: string;
  prefetch?: boolean;
  showTagline?: boolean;
};

type LogoMarkProps = {
  size?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function LogoMark({
  size = 36,
  className,
  imageClassName,
  priority = false,
}: LogoMarkProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="Question Hub logo"
        fill
        priority={priority}
        sizes={`${size}px`}
        className={cn("object-contain", imageClassName)}
      />
    </span>
  );
}

export function Logo({
  compact = false,
  href = "/",
  prefetch,
  showTagline = true,
}: LogoProps) {
  return (
    <Link href={href} prefetch={prefetch} className="inline-flex items-center gap-3">
      <LogoMark size={36} className="rounded-2xl" />
      {!compact ? (
        <span className="flex flex-col">
          <span className="headline text-lg font-semibold text-foreground">Question Hub</span>
          {showTagline ? (
            <span className="eyebrow text-[11px] text-muted-foreground">Students • Teachers • Admin</span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
