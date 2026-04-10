import Link from "next/link";

type LogoProps = {
  compact?: boolean;
  href?: string;
  prefetch?: boolean;
};

export function Logo({
  compact = false,
  href = "/",
  prefetch,
}: LogoProps) {
  return (
    <Link href={href} prefetch={prefetch} className="inline-flex items-center gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
        QH
      </span>
      {!compact ? (
        <span className="flex flex-col">
          <span className="headline text-lg font-semibold text-foreground">Question Hub</span>
          <span className="eyebrow text-[11px] text-muted-foreground">Students • Teachers • Admin</span>
        </span>
      ) : null}
    </Link>
  );
}
