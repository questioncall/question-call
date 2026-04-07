"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  CircleHelpIcon,
  CreditCardIcon,
  HomeIcon,
  MessageSquareIcon,
  Settings2Icon,
  SparklesIcon,
  TrophyIcon,
  UserCircle2Icon,
} from "lucide-react";

import { AuthenticatedHeader } from "@/components/shared/authenticated-header";
import { Logo } from "@/components/shared/logo";
import { NavUser } from "@/components/shared/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  getAskQuestionPath,
  getLeaderboardPath,
  getMessagesPath,
  getProfilePath,
  getSettingsPath,
  getSubscriptionPath,
  getUserHandle,
} from "@/lib/user-paths";

type WorkspaceRole = "STUDENT" | "TEACHER" | "ADMIN";

type WorkspaceUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  role: WorkspaceRole;
};

type WorkspaceShellProps = {
  user: WorkspaceUser;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function WorkspaceShell({ user, defaultOpen = true, children }: WorkspaceShellProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const pathname = usePathname();
  const handle = getUserHandle(user);
  const askQuestionHref = getAskQuestionPath(user);
  const leaderboardHref = getLeaderboardPath(user);
  const messageHref = getMessagesPath(user);
  const profileHref = getProfilePath(user);
  const settingsHref = getSettingsPath(user);
  const subscriptionHref = getSubscriptionPath(user);
  const billingLabel = user.role === "TEACHER" ? "Wallet" : "Subscription";
  const billingBadge = user.role === "STUDENT" ? "plan" : "wallet";
  const isBillingActive = user.role === "TEACHER"
    ? pathname.startsWith("/wallet")
    : pathname.startsWith("/subscription");
  const primaryHref = user.role === "STUDENT" ? askQuestionHref : messageHref;
  const primaryLabel = user.role === "STUDENT" ? "Ask question" : "Open messages";
  const showQuestionFilter = pathname === "/" || pathname.startsWith("/ask");

  const mainItems = [
    {
      href: "/",
      icon: HomeIcon,
      label: "Home",
      badge: null,
      isActive: pathname === "/",
      collapseSidebarOnClick: true,
    },
    {
      href: messageHref,
      icon: MessageSquareIcon,
      label: "Messages",
      badge: "4",
      isActive: pathname.startsWith("/message") || pathname.startsWith("/channel/"),
      collapseSidebarOnClick: true,
    },
    {
      href: askQuestionHref,
      icon: CircleHelpIcon,
      label: "Ask",
      badge: user.role === "STUDENT" ? "new" : null,
      isActive: pathname.startsWith("/ask"),
      collapseSidebarOnClick: true,
    },
    {
      href: leaderboardHref,
      icon: TrophyIcon,
      label: "Leaderboard",
      badge: null,
      isActive: pathname.startsWith("/leaderboard/"),
      collapseSidebarOnClick: true,
    },
    {
      href: profileHref,
      icon: UserCircle2Icon,
      label: "Profile",
      badge: null,
      isActive: pathname === profileHref,
      collapseSidebarOnClick: true,
    },
    {
      href: settingsHref,
      icon: Settings2Icon,
      label: "Settings",
      badge: null,
      isActive: pathname.startsWith("/settings"),
      collapseSidebarOnClick: true,
    },
    {
      href: subscriptionHref,
      icon: CreditCardIcon,
      label: billingLabel,
      badge: billingBadge,
      isActive: isBillingActive,
      collapseSidebarOnClick: true,
    },
  ] as const;

  const roleLabel = user.role === "STUDENT" ? "Student" : "Teacher";
  const roleSummary =
    user.role === "STUDENT"
      ? "Ask doubts, follow answers, and manage your learning flow."
      : "Track question activity, channel updates, and reputation from one place.";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-3 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-background px-3 py-3">
            <Logo compact />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">EduAsk</p>
              <p className="truncate text-xs text-sidebar-foreground/70">@{handle}</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigate</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      collapseSidebarOnClick={item.collapseSidebarOnClick}
                      isActive={item.isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Mode</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 p-3 text-xs leading-6 text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2 text-sidebar-foreground">
                  <SparklesIcon className="size-4" />
                  <span className="font-medium">{roleLabel} mode</span>
                </div>
                <p className="mt-2">{roleSummary}</p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser
            user={{
              name: user.name || roleLabel,
              email: user.email || "",
            }}
          />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh bg-[#f6f8fb] dark:bg-background">
        <AuthenticatedHeader
          isScrolled={isScrolled}
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
          showQuestionFilter={showQuestionFilter}
        />

        <div className={cn("flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6")}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
