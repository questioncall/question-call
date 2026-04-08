"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, Menu, Loader2, Clock, Lock, AlertTriangle } from "lucide-react";
import { getChannelPath } from "@/lib/user-paths";
import {
  setChannelsLoading,
  setChannelsList,
  updateChannelPreview,
  incrementChannelUnread,
  clearChannelUnread,
} from "@/store/features/channels/channels-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ChannelListItem } from "@/types/channel";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import { getUserPusherName, CHANNEL_UPDATED_EVENT } from "@/lib/pusher/events";

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
  const dispatch = useAppDispatch();
  const { items: channels, isHydrated, isLoading } = useAppSelector(
    (state) => state.channels,
  );
  const userId = useAppSelector((state) => state.user.id);
  const isMessageRoot = pathname === "/message";
  const isChannelPage = pathname.includes("/channel/");

  const [isCollapsed, setIsCollapsed] = useState(isChannelPage);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when pathname changes
  useEffect(() => {
    if (isMessageRoot) setIsCollapsed(false);
    if (isChannelPage) setIsCollapsed(true);
  }, [pathname, isMessageRoot, isChannelPage]);

  // Removed fetchChannels and Pusher logic because it's now handled globally in WorkspaceShell

  // Filter channels by search
  const filteredChannels = searchQuery
    ? channels.filter(
        (ch) =>
          ch.questionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ch.counterpartName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : channels;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "group z-20 flex shrink-0 flex-col border-r border-border bg-background transition-all duration-300 ease-in-out md:static absolute inset-y-0 left-0",
          isCollapsed
            ? "-translate-x-full md:w-20 md:translate-x-0 md:hover:w-80 md:hover:shadow-md md:[&:hover>div.sidebar-content]:opacity-100 md:[&:hover>div.sidebar-content]:pointer-events-auto md:[&:not(:hover)>div.sidebar-content]:opacity-0 md:[&:not(:hover)>div.sidebar-content]:pointer-events-none md:[&:not(:hover)>div.sidebar-collapsed-icons]:opacity-100 md:[&:hover>div.sidebar-collapsed-icons]:opacity-0"
            : "w-full translate-x-0 md:w-80",
        )}
      >
        {/* Collapsed view icons */}
        <div
          className={cn(
            "sidebar-collapsed-icons absolute inset-y-0 left-0 w-20 flex flex-col items-center pt-4 transition-opacity duration-200 delay-100",
            isCollapsed ? "hidden md:flex" : "hidden",
          )}
        >
          <div className="mb-4 text-muted-foreground">
            <Menu className="h-6 w-6" />
          </div>
          {filteredChannels.slice(0, 6).map((ch) => (
            <Avatar key={ch.id} className="mb-4 h-10 w-10 border border-border">
              <AvatarFallback>
                {ch.counterpartName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Full sidebar content */}
        <div
          className={cn(
            "sidebar-content flex h-full w-80 shrink-0 flex-col bg-background transition-opacity duration-300",
            isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-bold text-foreground">Channels</h2>
            {isChannelPage && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="rounded-full p-2 hover:bg-muted md:hidden"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search channels..."
                className="w-full bg-muted/50 pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-2">
            {isLoading && !isHydrated && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {isHydrated && filteredChannels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-sm font-medium text-foreground">No channels yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Accept a question from the feed to start a channel.
                </p>
              </div>
            )}

            <div className="space-y-1 pb-4">
              {filteredChannels.map((ch) => {
                const isActive = pathname.includes(ch.id);
                const StatusIcon = STATUS_ICONS[ch.status] || Clock;

                return (
                  <Link
                    key={ch.id}
                    href={getChannelPath(ch.id)}
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setIsCollapsed(true);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50",
                      isActive ? "bg-muted" : "bg-transparent",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarFallback>
                          {ch.counterpartName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {ch.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 text-[10px] font-bold text-white shadow-sm">
                          {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between pt-0.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {ch.counterpartName}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatTimeAgo(ch.lastMessageAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                        <StatusIcon className="size-3 shrink-0" />
                        {ch.role === "asker" ? "You asked" : "You're helping"} •{" "}
                        {STATUS_LABEL[ch.status]}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {ch.lastMessagePreview || ch.questionTitle}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
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
