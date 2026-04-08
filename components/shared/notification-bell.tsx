"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon, CheckCheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import { getUserPusherName, NOTIFICATION_EVENT } from "@/lib/pusher/events";

type NotificationType =
  | "RATING_RECEIVED"
  | "QUESTION_ACCEPTED"
  | "QUESTION_RESET"
  | "CHANNEL_CLOSED"
  | "PAYMENT";

type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  RATING_RECEIVED: "⭐",
  QUESTION_ACCEPTED: "✅",
  QUESTION_RESET: "🔄",
  CHANNEL_CLOSED: "🔒",
  PAYMENT: "💳",
};

function formatTimeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type NotificationBellProps = {
  userId: string;
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to real-time notifications via Pusher
  useEffect(() => {
    if (!userId) return;
    const client = getPusherClient();
    if (!client) return;

    const userChannel = client.subscribe(getUserPusherName(userId));

    userChannel.bind(NOTIFICATION_EVENT, (payload: { notification: Notification }) => {
      if (payload.notification) {
        setNotifications((prev) => [payload.notification, ...prev]);
      }
    });

    return () => {
      userChannel.unbind(NOTIFICATION_EVENT);
      client.unsubscribe(getUserPusherName(userId));
    };
  }, [userId]);

  // Fetch on open
  useEffect(() => {
    if (isOpen) void fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications/all", { method: "POST" });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Notifications"
      >
        <BellIcon className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-background shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={markAllRead}
                >
                  <CheckCheckIcon className="size-3.5" />
                  Mark all read
                </Button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <BellIcon className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => { void markRead(n.id); }}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 ${
                    !n.isRead ? "bg-primary/5" : "bg-transparent"
                  }`}
                >
                  <span className="shrink-0 text-lg leading-none mt-0.5">
                    {NOTIFICATION_ICONS[n.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug break-words ${!n.isRead ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {n.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/60">
                      {formatTimeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-1.5 shrink-0 size-2 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-border/60 px-4 py-2.5 text-center">
              <span className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
