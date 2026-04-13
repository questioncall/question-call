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
    <nav className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => {
        // Exact match only - don't highlight parent when on child route
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
