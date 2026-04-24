"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BanknoteIcon,
  BellIcon,
  CreditCardIcon,
  HistoryIcon,
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
import { getPusherClient } from "@/lib/pusher/pusherClient";
import { ADMIN_UPDATES_CHANNEL, ADMIN_WITHDRAWAL_EVENT } from "@/lib/pusher/events";

type AdminNotification = {
  id: string;
  category: "WITHDRAWAL" | "PAYMENT" | "EXPIRY";
  title: string;
  message: string;
  createdAt: string;
  href: string;
  isRead: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function dispatchUnreadCount(unreadNotifications: number) {
  window.dispatchEvent(
    new CustomEvent("admin-notifications-read", {
      detail: { unreadNotifications },
    }),
  );
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | AdminNotification["category"]>("ALL");
  const [showHistory, setShowHistory] = useState(false);

  const fetchNotifications = async (includeHistory = false) => {
    try {
      setLoading(true);
      const url = includeHistory ? "/api/admin/notifications?history=true" : "/api/admin/notifications";
      const res = await fetch(url);

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

  const markNotificationsSeen = useCallback(async (ids: string[]) => {
    const unreadIds = Array.from(
      new Set(
        ids.filter((id) =>
          notifications.some((notification) => notification.id === id && !notification.isRead),
        ),
      ),
    );

    if (unreadIds.length === 0) {
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        unreadIds.includes(notification.id)
          ? { ...notification, isRead: true }
          : notification,
      ),
    );

    try {
      const res = await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update notifications");
      }

      dispatchUnreadCount(
        typeof data.unreadNotifications === "number" ? data.unreadNotifications : 0,
      );
      setError(null);
    } catch (err) {
      setNotifications((prev) =>
        prev.map((notification) =>
          unreadIds.includes(notification.id)
            ? { ...notification, isRead: false }
            : notification,
        ),
      );
      setError(getErrorMessage(err));
      void fetchNotifications(showHistory);
    }
  }, [notifications, showHistory]);

  useEffect(() => {
    void fetchNotifications(showHistory);
  }, [showHistory]);

  useEffect(() => {
    const client = getPusherClient();
    if (!client) {
      return;
    }

    const channel = client.subscribe(ADMIN_UPDATES_CHANNEL);
    const refresh = () => {
      void fetchNotifications(showHistory);
    };

    channel.bind(ADMIN_WITHDRAWAL_EVENT, refresh);
    channel.bind("admin:manual-payment-submitted", refresh);

    return () => {
      channel.unbind(ADMIN_WITHDRAWAL_EVENT, refresh);
      channel.unbind("admin:manual-payment-submitted", refresh);
      client.unsubscribe(ADMIN_UPDATES_CHANNEL);
    };
  }, [showHistory]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchNotifications(showHistory);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [showHistory]);

  const filteredNotifications =
    filter === "ALL"
      ? notifications
      : notifications.filter((notification) => notification.category === filter);

  const counts = {
    WITHDRAWAL: notifications.filter((item) => item.category === "WITHDRAWAL").length,
    PAYMENT: notifications.filter((item) => item.category === "PAYMENT").length,
    EXPIRY: notifications.filter((item) => item.category === "EXPIRY").length,
  };
  const unreadCount = filteredNotifications.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (showHistory) {
      return;
    }

    const visibleUnreadIds = filteredNotifications
      .filter((notification) => !notification.isRead)
      .map((notification) => notification.id);

    if (visibleUnreadIds.length > 0) {
      void markNotificationsSeen(visibleUnreadIds);
    }
  }, [filter, filteredNotifications, markNotificationsSeen, showHistory]);

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
          {!showHistory ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {unreadCount === 0
                ? "All visible alerts have been marked as seen."
                : `${unreadCount} visible alert${unreadCount === 1 ? "" : "s"} still unread.`}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <HistoryIcon className="mr-2 size-4" />
            {showHistory ? "Show Live" : "History"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchNotifications(showHistory)}>
            Refresh
          </Button>
        </div>
      </div>

      {!showHistory ? (
        <>
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
                  <Button variant="outline" size="sm" onClick={() => fetchNotifications(showHistory)}>
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
                      className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${
                        notification.isRead
                          ? "border-border bg-background"
                          : "border-primary/30 bg-primary/5"
                      }`}
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
                          <div className="flex items-center gap-2">
                            {!notification.isRead ? (
                              <span className="size-2 rounded-full bg-primary" />
                            ) : null}
                            <p className="text-sm font-semibold text-foreground">
                              {notification.title}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button asChild variant={notification.isRead ? "outline" : "default"} size="sm">
                        <Link
                          href={notification.href}
                          onClick={() => {
                            if (!showHistory && !notification.isRead) {
                              void markNotificationsSeen([notification.id]);
                            }
                          }}
                        >
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
        </>
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Notification History</CardTitle>
            <CardDescription>
              Complete history of all past notifications ({notifications.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications in history.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-6">Details</div>
                  <div className="col-span-2">Action</div>
                </div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="grid grid-cols-12 gap-2 rounded-lg border border-border bg-background p-2 text-sm"
                  >
                    <div className="col-span-2 flex items-center text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          notification.category === "WITHDRAWAL"
                            ? "bg-amber-100 text-amber-700"
                            : notification.category === "PAYMENT"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {notification.category}
                      </span>
                    </div>
                    <div className="col-span-6 flex items-center truncate text-muted-foreground">
                      {notification.message.substring(0, 60)}...
                    </div>
                    <div className="col-span-2 flex items-center">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={notification.href}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
