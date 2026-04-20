"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, Menu, Loader2, Clock, Lock, AlertTriangle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppSelector } from "@/store/hooks";
import { getChannelPath } from "@/lib/user-paths";
import { cn } from "@/lib/utils";

function formatTimeAgo(value?: string) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  ACTIVE: Clock,
  CLOSED: Lock,
  EXPIRED: AlertTriangle,
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  CLOSED: "Closed",
  EXPIRED: "Expired",
};

export function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { items: channels, isHydrated, isLoading } = useAppSelector(
    (state) => state.channels,
  );
  const isMessageRoot = pathname === "/message";
  const isChannelPage = pathname.includes("/channel/");
  const isCollapsed = isChannelPage && !isMessageRoot;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredChannels = searchQuery
    ? channels.filter(
        (channel) =>
          channel.questionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.counterpartName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : channels;

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background">
      <div
        className={cn(
          "group absolute inset-y-0 left-0 z-20 flex min-h-0 max-w-full shrink-0 flex-col border-r border-border bg-background transition-all duration-300 ease-in-out md:static",
          isCollapsed
            ? "-translate-x-full md:w-20 md:translate-x-0 md:hover:w-80 md:hover:shadow-md md:[&:hover>div.sidebar-content]:pointer-events-auto md:[&:hover>div.sidebar-content]:opacity-100 md:[&:hover>div.sidebar-collapsed-icons]:opacity-0 md:[&:not(:hover)>div.sidebar-content]:pointer-events-none md:[&:not(:hover)>div.sidebar-content]:opacity-0 md:[&:not(:hover)>div.sidebar-collapsed-icons]:opacity-100"
            : "w-full translate-x-0 md:w-80",
        )}
      >
        <div
          className={cn(
            "sidebar-collapsed-icons absolute inset-y-0 left-0 flex w-20 flex-col items-center pt-4 transition-opacity duration-200 delay-100",
            isCollapsed ? "hidden md:flex" : "hidden",
          )}
        >
          <div className="mb-4 text-muted-foreground">
            <Menu className="h-6 w-6" />
          </div>
          {filteredChannels.slice(0, 6).map((channel) => (
            <Avatar key={channel.id} className="mb-4 h-10 w-10 border border-border">
              <AvatarFallback>
                {channel.counterpartName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>

        <div
          className={cn(
            "sidebar-content flex h-full min-h-0 w-full shrink-0 flex-col bg-background transition-opacity duration-300 md:w-80",
            isCollapsed ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-bold text-foreground">Channels</h2>
          </div>

          <div className="shrink-0 p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search channels..."
                className="w-full bg-muted/50 pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-2 pb-4">
              {isLoading && !isHydrated && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {isHydrated && filteredChannels.length === 0 && (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">No channels yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Accept a question from the feed to start a channel.
                  </p>
                </div>
              )}

              <div className="space-y-1 pb-4">
                {filteredChannels.map((channel) => {
                  const isActive = pathname.includes(channel.id);
                  const StatusIcon = STATUS_ICONS[channel.status] || Clock;

                  return (
                    <Link
                      key={channel.id}
                      href={getChannelPath(channel.id)}
                      className={cn(
                        "flex min-w-0 items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50",
                        isActive ? "bg-muted" : "bg-transparent",
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border border-border">
                          <AvatarFallback>
                            {channel.counterpartName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {channel.unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 text-[10px] font-bold text-white shadow-sm">
                            {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 items-baseline justify-between gap-2 pt-0.5">
                          <p
                            className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
                            title={channel.counterpartName}
                          >
                            {channel.counterpartName}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatTimeAgo(channel.lastMessageAt)}
                          </span>
                        </div>

                        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          <StatusIcon className="size-3 shrink-0" />
                          <span className="truncate">
                            {channel.role === "asker" ? "You asked" : "You're helping"} •{" "}
                            {STATUS_LABEL[channel.status]}
                          </span>
                        </p>

                        <p
                          className="mt-1 truncate text-xs text-muted-foreground"
                          title={channel.lastMessagePreview || channel.questionTitle}
                        >
                          {channel.lastMessagePreview || channel.questionTitle}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {isChannelPage && (
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background p-4 md:hidden">
            <Link
              href="/message"
              className="flex items-center text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              <span>Channels</span>
            </Link>
          </div>
        )}
        <div className="flex-1 overflow-hidden bg-background">{children}</div>
      </div>
    </div>
  );
}
