"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Admin Tabs
          </p>
          <p className="mt-1 text-sm text-foreground">
            Settings holds the hub. The tabs below handle the broader admin operations.
          </p>
        </div>
        <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
          {items.length} tabs
        </span>
      </div>

      <nav className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/80 bg-background text-foreground hover:border-primary/30 hover:bg-primary/[0.06]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
