"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  CircleHelpIcon,
  CreditCardIcon,
  GraduationCapIcon,
  HomeIcon,
  MessageSquareIcon,
  Settings2Icon,
  SparklesIcon,
  TrophyIcon,
  UploadIcon,
  UserCircle2Icon,
  WalletIcon,
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
  getWalletPath,
  getUserHandle,
} from "@/lib/user-paths";
import { setProfile } from "@/store/features/user/user-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import { getUserPusherName, CHANNEL_UPDATED_EVENT, NEW_CHANNEL_EVENT } from "@/lib/pusher/events";
import {
  setChannelsLoading,
  setChannelsList,
  updateChannelPreview,
  incrementChannelUnread,
  clearChannelUnread,
  upsertChannelItem,
} from "@/store/features/channels/channels-slice";
import type { ChannelListItem } from "@/types/channel";

type WorkspaceRole = "STUDENT" | "TEACHER" | "ADMIN";

type WorkspaceUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  role: WorkspaceRole;
  userImage?: string | null;
};

type WorkspaceShellProps = {
  user: WorkspaceUser;
  defaultOpen?: boolean;
  children: ReactNode;
};

type ChannelUpdatedPayload = {
  channelId: string;
  unreadCountCleared?: boolean;
  unreadCountIncrement?: number;
  lastMessagePreview?: string;
  lastMessageAt?: string;
};

type NewChannelPayload = {
  channel?: ChannelListItem;
};

export function WorkspaceShell({ user, defaultOpen = true, children }: WorkspaceShellProps) {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.user);
  const { items: channels, isHydrated: channelsHydrated } = useAppSelector((state) => state.channels);

  const totalUnreadChannels = channels.reduce(
    (acc, ch) => acc + (ch.unreadCount > 0 ? 1 : 0),
    0
  );

  // Fetch channels from API (global)
  const fetchChannels = useCallback(async () => {
    dispatch(setChannelsLoading());
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data: ChannelListItem[] = await res.json();
        dispatch(setChannelsList(data));
      }
    } catch {
      // Silently fail
    }
  }, [dispatch]);

  useEffect(() => {
    if (!channelsHydrated) {
      fetchChannels();
    }
  }, [fetchChannels, channelsHydrated]);

  // Subscribe to user-specific channel for real-time list updates (global)
  useEffect(() => {
    if (!user.id) return;

    const pusherClient = getPusherClient();
    if (!pusherClient) return;

    const userChannel = getUserPusherName(user.id);
    const channel = pusherClient.subscribe(userChannel);

    channel.bind(CHANNEL_UPDATED_EVENT, (data: ChannelUpdatedPayload) => {
      if (data.unreadCountCleared) {
        dispatch(clearChannelUnread(data.channelId));
      } else {
        if (data.lastMessagePreview && data.lastMessageAt) {
          dispatch(
            updateChannelPreview({
              channelId: data.channelId,
              preview: data.lastMessagePreview,
              at: data.lastMessageAt,
            })
          );
        }
        if (data.unreadCountIncrement) {
          // Verify we aren't currently viewing this active channel
          const currentViewingId = window.location.pathname.split("/").pop();
          if (currentViewingId !== data.channelId) {
            dispatch(
              incrementChannelUnread({
                channelId: data.channelId,
                incrementBy: data.unreadCountIncrement,
              })
            );
          }
        }
      }
    });

    channel.bind(NEW_CHANNEL_EVENT, (data: NewChannelPayload) => {
      if (data.channel) {
        dispatch(upsertChannelItem(data.channel));
      }
    });

    return () => {
      channel.unbind(CHANNEL_UPDATED_EVENT);
      channel.unbind(NEW_CHANNEL_EVENT);
      pusherClient.unsubscribe(userChannel);
    };
  }, [user.id, dispatch]);

  useEffect(() => {
    dispatch(setProfile({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      role: user.role,
      userImage: user.userImage ?? "",
      subscriptionStatus: "NONE",
      subscriptionEnd: null,
      planSlug: "free",
      pendingManualPayment: false,
      questionsAsked: 0,
    }));
  }, [dispatch, user.email, user.id, user.name, user.role, user.userImage, user.username]);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const pathname = usePathname();

  // Keep shell identity in sync with profile edits that already landed in Redux.
  const resolvedUser = {
    ...user,
    name: profile.name || user.name || "",
    email: profile.email || user.email || "",
    username: profile.username || user.username || "",
    role: profile.isHydrated ? profile.role : user.role,
    userImage: profile.userImage || user.userImage || "",
  };

  const handle = getUserHandle(resolvedUser);
  const askQuestionHref = getAskQuestionPath(resolvedUser);
  const leaderboardHref = getLeaderboardPath(resolvedUser);
  const messageHref = getMessagesPath(resolvedUser);
  const profileHref = getProfilePath(resolvedUser);
  const settingsHref = getSettingsPath(resolvedUser);
  const subscriptionHref = getSubscriptionPath(resolvedUser);
  const walletHref = getWalletPath(resolvedUser);
  const primaryHref = resolvedUser.role === "STUDENT" ? askQuestionHref : messageHref;
  const primaryLabel = resolvedUser.role === "STUDENT" ? "Post Question" : "Open messages";
  const useModalForPrimary = resolvedUser.role === "STUDENT";
  const showQuestionFilter = pathname === "/" || pathname.startsWith("/ask");
  const isChatPage = pathname.startsWith("/message") || pathname.startsWith("/channel");

  const mainItems = [
    {
      href: "/",
      icon: HomeIcon,
      label: "Home",
      badge: null,
      badgeClassName: undefined,
      isActive: pathname === "/",
      collapseSidebarOnClick: true,
    },
    {
      href: messageHref,
      icon: MessageSquareIcon,
      label: "Messages",
      badge: totalUnreadChannels > 0 ? totalUnreadChannels.toString() : null,
      badgeClassName: "text-white bg-red-500 rounded-full h-4 min-w-[16px] text-[10px] px-1 flex items-center justify-center peer-hover/menu-button:text-white peer-data-active/menu-button:text-white group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:!translate-y-0",
      isActive: pathname.startsWith("/message") || pathname.startsWith("/channel/"),
      collapseSidebarOnClick: true,
    },
    {
      href: askQuestionHref,
      icon: CircleHelpIcon,
      label: "Ask",
      badge: resolvedUser.role === "STUDENT" ? "new" : null,
      badgeClassName: "text-primary bg-primary/10",
      isActive: pathname.startsWith("/ask"),
      collapseSidebarOnClick: true,
    },
    {
      href: leaderboardHref,
      icon: TrophyIcon,
      label: "Leaderboard",
      badge: null,
      badgeClassName: undefined,
      isActive: pathname.startsWith("/leaderboard/"),
      collapseSidebarOnClick: true,
    },
    {
      href: profileHref,
      icon: UserCircle2Icon,
      label: "Profile",
      badge: null,
      badgeClassName: undefined,
      isActive: pathname === profileHref,
      collapseSidebarOnClick: true,
    },
    {
      href: settingsHref,
      icon: Settings2Icon,
      label: "Settings",
      badge: null,
      badgeClassName: undefined,
      isActive: pathname.startsWith("/settings"),
      collapseSidebarOnClick: true,
    },
    ...(resolvedUser.role === "STUDENT"
      ? [{
          href: subscriptionHref,
          icon: CreditCardIcon,
          label: "Subscription",
          badge: "plan",
          badgeClassName: "text-muted-foreground bg-muted",
          isActive: pathname.startsWith("/subscription"),
          collapseSidebarOnClick: true,
        }]
      : []),
{
      href: walletHref,
      icon: WalletIcon,
      label: "Wallet",
      badge: resolvedUser.role === "STUDENT" ? "points" : "cashout",
      badgeClassName: "text-muted-foreground bg-muted",
      isActive: pathname.startsWith("/wallet"),
      collapseSidebarOnClick: true,
    },
    ...(resolvedUser.role === "STUDENT"
      ? [{
          href: "/courses",
          icon: BookOpenIcon,
          label: "Courses",
          badge: null,
          badgeClassName: undefined,
          isActive: pathname.startsWith("/courses"),
          collapseSidebarOnClick: true,
        },
        {
          href: "/courses/my",
          icon: GraduationCapIcon,
          label: "My Courses",
          badge: null,
          badgeClassName: undefined,
          isActive: pathname.startsWith("/courses/my"),
          collapseSidebarOnClick: true,
        }]
      : []),
    ...(resolvedUser.role === "TEACHER" || resolvedUser.role === "ADMIN"
      ? [{
          href: "/courses",
          icon: BookOpenIcon,
          label: "Courses",
          badge: null,
          badgeClassName: undefined,
          isActive: pathname.startsWith("/courses"),
          collapseSidebarOnClick: true,
        },
        {
          href: "/courses/my",
          icon: GraduationCapIcon,
          label: "My Courses",
          badge: null,
          badgeClassName: undefined,
          isActive: pathname.startsWith("/courses/my"),
          collapseSidebarOnClick: true,
        },
        {
          href: "/upload-course",
          icon: UploadIcon,
          label: "Upload Course",
          badge: null,
          badgeClassName: undefined,
          isActive: pathname.startsWith("/upload-course"),
          collapseSidebarOnClick: true,
        }]
      : []),
  ] as const;

  const roleLabel = resolvedUser.role === "STUDENT" ? "Student" : "Teacher";
  const roleSummary =
    resolvedUser.role === "STUDENT"
      ? "Ask doubts, follow answers, and manage your learning flow."
      : "Track question activity, channel updates, and reputation from one place.";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-3 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-background px-3 py-3">
            <Logo compact />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <h1 className="truncate text-sm font-bold text-sidebar-foreground hidden md:block">Question Hub</h1>
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
                    {item.badge ? (
                      <SidebarMenuBadge className={item.badgeClassName}>
                        {item.badge}
                      </SidebarMenuBadge>
                    ) : null}
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
              name: resolvedUser.name || roleLabel,
              email: resolvedUser.email || "",
              userImage: resolvedUser.userImage || "",
            }}
          />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className={cn("bg-[#f6f8fb] dark:bg-background flex flex-col", isChatPage ? "h-svh overflow-hidden" : "min-h-svh")}>
        <AuthenticatedHeader
          isScrolled={isScrolled}
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
          showQuizLink={resolvedUser.role === "STUDENT"}
          showQuestionFilter={showQuestionFilter}
          useModalForPrimary={useModalForPrimary}
          userId={resolvedUser.id}
        />

        <div className={cn("flex flex-1 flex-col", isChatPage ? "overflow-hidden" : "gap-6 px-4 py-6 lg:px-6")}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

