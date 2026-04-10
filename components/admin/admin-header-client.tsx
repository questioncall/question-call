"use client";

import { useEffect, useState } from "react";
import { BellIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminCounts {
  pendingWithdrawals: number;
  expiredSubscriptions: number;
  pendingManualSubscriptions: number;
  unreadNotifications: number;
}

export function AdminHeaderClient({ initialCounts }: { initialCounts: AdminCounts }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<AdminCounts>(initialCounts);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(Date.now());

  const fetchCounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/counts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCounts(data);
      setLastFetched(Date.now());
    } catch (err) {
      console.error("Failed to fetch counts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const totalNotifications =
    counts.pendingWithdrawals +
    counts.expiredSubscriptions +
    counts.pendingManualSubscriptions;

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/notifications">
            <BellIcon className="size-5" />
          </Link>
        </Button>
        {totalNotifications > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {totalNotifications > 9 ? "9+" : totalNotifications}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs">
        {loading && lastFetched === 0 ? (
          <Loader2Icon className="size-3 animate-spin" />
        ) : (
          <>
            <span className="flex flex-col items-center">
              <span className="font-medium text-foreground">
                {counts.pendingWithdrawals}
              </span>
              <span className="text-[10px] text-muted-foreground">Withdrawals</span>
            </span>
            <span className="mx-1 h-4 w-px bg-border" />
            <span className="flex flex-col items-center">
              <span className="font-medium text-foreground">
                {counts.expiredSubscriptions}
              </span>
              <span className="text-[10px] text-muted-foreground">Expired</span>
            </span>
            <span className="mx-1 h-4 w-px bg-border" />
            <span className="flex flex-col items-center">
              <span className="font-medium text-foreground">
                {counts.pendingManualSubscriptions}
              </span>
              <span className="text-[10px] text-muted-foreground">Payments</span>
            </span>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 size-6"
          onClick={fetchCounts}
          disabled={loading}
        >
          <Loader2Icon className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ThemeToggle />
    </div>
  );
}