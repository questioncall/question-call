"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, Menu } from "lucide-react";
import { getChannelPath } from "@/lib/user-paths";

// Using the same mock threads for now, this could be passed as a prop if fetched from a server component
const threads = [
  {
    id: "chn_101",
    title: "Why does current split in a parallel circuit?",
    counterpart: "Rohit Sir",
    preview: "Start by thinking of each branch like a different width road...",
    status: "Active",
    role: "Teacher",
    unread: true,
  },
  {
    id: "chn_214",
    title: "Need a faster way to complete the square",
    counterpart: "Meera Tutor",
    preview: "Picture the missing corner of the square before touching the formula.",
    status: "Waiting for rating",
    role: "Teacher",
    unread: false,
  },
  {
    id: "chn_315",
    title: "Video help for balancing redox reactions",
    counterpart: "Anjana Koirala",
    preview: "I can explain the half-reaction method once you confirm the acidic-medium step.",
    status: "Shared with peer",
    role: "Student",
    unread: false,
  },
];

export function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessageRoot = pathname === "/message";
  const isChannelPage = pathname.includes("/channel/");
  
  // Collapse state: By default, collapsed if we are in a channel page on desktop.
  const [isCollapsed, setIsCollapsed] = useState(isChannelPage);

  // Sync state when pathname changes
  useEffect(() => {
    if (isMessageRoot) setIsCollapsed(false);
    if (isChannelPage) setIsCollapsed(true);
  }, [pathname, isMessageRoot, isChannelPage]);

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Sidebar Area (Static to push right content responsively) */}
      <div
        className={cn(
          "group z-20 flex shrink-0 flex-col border-r border-border bg-background transition-all duration-300 ease-in-out md:static absolute inset-y-0 left-0",
          isCollapsed
            ? "-translate-x-full md:w-20 md:translate-x-0 md:hover:w-80 md:hover:shadow-md md:[&:hover>div.sidebar-content]:opacity-100 md:[&:hover>div.sidebar-content]:pointer-events-auto md:[&:not(:hover)>div.sidebar-content]:opacity-0 md:[&:not(:hover)>div.sidebar-content]:pointer-events-none md:[&:not(:hover)>div.sidebar-collapsed-icons]:opacity-100 md:[&:hover>div.sidebar-collapsed-icons]:opacity-0"
            : "w-full translate-x-0 md:w-80"
        )}
      >
        {/* Collapsed view icons (Only visible when strictly collapsed on desktop and not hovered) */}
        <div 
          className={cn(
            "sidebar-collapsed-icons absolute inset-y-0 left-0 w-20 flex flex-col items-center pt-4 transition-opacity duration-200 delay-100", 
            isCollapsed ? "hidden md:flex" : "hidden"
          )}
        >
          <div className="mb-4 text-muted-foreground"><Menu className="h-6 w-6" /></div>
          {threads.map(t => (
            <Avatar key={t.id} className="mb-4 h-10 w-10 border border-border">
              <AvatarFallback>{t.counterpart.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Full sidebar content (Visible when expanded or hovered) */}
        <div 
          className={cn(
            "sidebar-content flex h-full w-80 shrink-0 flex-col bg-background transition-opacity duration-300", 
            isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
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
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 pb-4">
              {threads.map((thread) => {
                 const isActive = pathname.includes(thread.id);
                 return (
                   <Link
                     key={thread.id}
                     href={getChannelPath(thread.id)}
                     onClick={() => {
                        // On mobile, navigating should collapse the sidebar to show the chat
                        if (window.innerWidth < 768) {
                          setIsCollapsed(true);
                        }
                     }}
                     className={cn(
                       "flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50",
                       isActive ? "bg-muted" : "bg-transparent"
                     )}
                   >
                     <div className="relative shrink-0">
                       <Avatar className="h-12 w-12 border border-border">
                         <AvatarFallback>{thread.counterpart.substring(0, 2).toUpperCase()}</AvatarFallback>
                       </Avatar>
                       {thread.unread && (
                         <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-background bg-foreground" />
                       )}
                     </div>
                     <div className="min-w-0 flex-1">
                       <div className="flex items-baseline justify-between pt-0.5">
                         <p className="truncate text-sm font-medium text-foreground">{thread.counterpart}</p>
                         <span className="shrink-0 text-xs text-muted-foreground">2h</span>
                       </div>
                       <p className="truncate text-xs text-muted-foreground">{thread.role} • {thread.status}</p>
                       <p className="mt-1 truncate text-xs text-muted-foreground">{thread.preview}</p>
                     </div>
                   </Link>
                 )
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header overlay block when in channel page so user can go back */}
        {isChannelPage && (
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background p-4 md:hidden">
            <Link href="/message" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="mr-2 h-5 w-5" />
              <span>Channels</span>
            </Link>
          </div>
        )}
        <div className="flex-1 overflow-auto bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
