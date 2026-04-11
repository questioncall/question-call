"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BanknoteIcon,
  BellIcon,
  CreditCardIcon,
  Loader2Icon,
  ShieldAlertIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminNotification = {
  id: string;
  category: "WITHDRAWAL" | "PAYMENT" | "EXPIRY";
  title: string;
  message: string;
  createdAt: string;
  href: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | AdminNotification["category"]>("ALL");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      const data = await res.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    const markNotificationsAsRead = async () => {
      try {
        await fetch("/api/notifications/all", { method: "POST" });
        window.dispatchEvent(new Event("admin-notifications-read"));
      } catch {
        // Non-blocking: admin alerts page should still render even if read-sync fails.
      }
    };

    void markNotificationsAsRead();
  }, []);

  const filteredNotifications =
    filter === "ALL"
      ? notifications
      : notifications.filter((notification) => notification.category === filter);

  const counts = {
    WITHDRAWAL: notifications.filter((item) => item.category === "WITHDRAWAL").length,
    PAYMENT: notifications.filter((item) => item.category === "PAYMENT").length,
    EXPIRY: notifications.filter((item) => item.category === "EXPIRY").length,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            <BellIcon className="mr-2 inline-block size-6 text-primary" />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the same alerts that power the admin notification badge.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchNotifications}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filter === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("ALL")}
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={filter === "WITHDRAWAL" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("WITHDRAWAL")}
        >
          Withdrawals ({counts.WITHDRAWAL})
        </Button>
        <Button
          variant={filter === "PAYMENT" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("PAYMENT")}
        >
          Payments ({counts.PAYMENT})
        </Button>
        <Button
          variant={filter === "EXPIRY" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("EXPIRY")}
        >
          Expired ({counts.EXPIRY})
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Admin Alerts</CardTitle>
          <CardDescription>
            {filteredNotifications.length} visible out of {notifications.length} total alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <AlertCircleIcon className="size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchNotifications}>
                Retry
              </Button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No alerts in this category right now.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      {notification.category === "WITHDRAWAL" ? (
                        <BanknoteIcon className="size-4" />
                      ) : notification.category === "PAYMENT" ? (
                        <CreditCardIcon className="size-4" />
                      ) : (
                        <ShieldAlertIcon className="size-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={notification.href}>
                      Open
                      <ArrowRightIcon className="ml-1 size-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
