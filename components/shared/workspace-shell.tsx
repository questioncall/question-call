"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  CreditCardIcon,
  GraduationCapIcon,
  HomeIcon,
  MessageSquareIcon,
  Settings2Icon,
  SparklesIcon,
  TrophyIcon,
  UserCircle2Icon,
  WalletIcon,
} from "lucide-react";

import { AuthenticatedHeader } from "@/components/shared/authenticated-header";
import { WorkspaceFilterProvider } from "@/components/shared/workspace-filter-context";
import { LogoMark } from "@/components/shared/logo";
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
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_CALL_SETTINGS,
  type UserCallSettings,
} from "@/lib/call-settings";

import {
  enqueueIncomingCall,
  removeIncomingCall as removeIncomingCallFromQueue,
} from "@/lib/incoming-call-queue";
import { cn } from "@/lib/utils";
import {
  getLeaderboardPath,
  getMessagesPath,
  getProfilePath,
  getSettingsPath,
  getSubscriptionPath,
  getWalletPath,
  getUserHandle,
} from "@/lib/user-paths";
import { setProfile, updateProfile } from "@/store/features/user/user-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import {
  getUserPusherName,
  CHANNEL_UPDATED_EVENT,
  NEW_CHANNEL_EVENT,
  PLATFORM_SOCIAL_LINKS_UPDATED_EVENT,
  PLATFORM_UPDATES_CHANNEL,
  SUBSCRIPTION_UPDATED_EVENT,
  CALL_INCOMING_EVENT,
  CALL_ACCEPTED_EVENT,
  CALL_REJECTED_EVENT,
  CALL_CANCELLED_EVENT,
  CALL_MISSED_EVENT,
} from "@/lib/pusher/events";
import { IncomingCallOverlay, type IncomingCallPayload } from "@/components/shared/incoming-call-overlay";
import { OutgoingCallOverlay, type OutgoingCallState } from "@/components/shared/outgoing-call-overlay";
import {
  setChannelsLoading,
  setChannelsList,
  updateChannelPreview,
  incrementChannelUnread,
  clearChannelUnread,
  upsertChannelItem,
} from "@/store/features/channels/channels-slice";
import type { ChannelListItem } from "@/types/channel";
import { APP_NAME } from "@/lib/constants";
import type { PlatformSocialLinks } from "@/models/PlatformConfig";

type WorkspaceRole = "STUDENT" | "TEACHER" | "ADMIN";

type WorkspaceUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  role: WorkspaceRole;
  userImage?: string | null;
  callSettings: UserCallSettings;
};

type WorkspaceShellProps = {
  user: WorkspaceUser;
  socialLinks: PlatformSocialLinks;
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

const SIDEBAR_SKELETON_ITEMS = 8;

function WorkspaceSidebarHeaderSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/75 p-2 shadow-sm group-data-[collapsible=icon]:justify-center">
      <Skeleton className="size-8 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5 group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-18" />
      </div>
    </div>
  );
}

function WorkspaceSidebarNavigationSkeleton() {
  return (
    <SidebarMenu>
      {Array.from({ length: SIDEBAR_SKELETON_ITEMS }, (_, index) => (
        <SidebarMenuItem key={`sidebar-skeleton-${index}`}>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function WorkspaceSidebarModeSkeleton() {
  return (
    <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/70 p-3 shadow-sm group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[88%]" />
        <Skeleton className="h-3 w-[64%]" />
      </div>
    </div>
  );
}

export function WorkspaceShell({
  user,
  socialLinks,
  defaultOpen = true,
  children,
}: WorkspaceShellProps) {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.user);
  const {
    items: channels,
    isHydrated: channelsHydrated,
  } = useAppSelector((state) => state.channels);
  const [hasCompletedInitialSidebarLoad, setHasCompletedInitialSidebarLoad] =
    useState(channelsHydrated);
  const [liveSocialLinks, setLiveSocialLinks] = useState<PlatformSocialLinks>(socialLinks);

  // ── Global call state ───────────────────────────────────────
  const [incomingCalls, setIncomingCalls] = useState<IncomingCallPayload[]>([]);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallState | null>(null);
  const [outgoingAcceptedCallId, setOutgoingAcceptedCallId] = useState<string | null>(null);
  const [outgoingRejectedCallId, setOutgoingRejectedCallId] = useState<string | null>(null);
  const [outgoingMissedCallId, setOutgoingMissedCallId] = useState<string | null>(null);

  const removeIncomingCall = useCallback((callSessionId?: string) => {
    setIncomingCalls((prev) => removeIncomingCallFromQueue(prev, callSessionId));
  }, []);

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
    } finally {
      setHasCompletedInitialSidebarLoad(true);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!channelsHydrated) {
      fetchChannels();
    }
  }, [fetchChannels, channelsHydrated]);

  useEffect(() => {
    if (channelsHydrated) {
      setHasCompletedInitialSidebarLoad(true);
    }
  }, [channelsHydrated]);

  useEffect(() => {
    setLiveSocialLinks(socialLinks);
  }, [socialLinks]);



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

    channel.bind(SUBSCRIPTION_UPDATED_EVENT, (data: {
      subscriptionStatus: string;
      subscriptionEnd: string | null;
      planSlug: string;
      questionsAsked?: number;
    }) => {
      dispatch(updateProfile({
        subscriptionStatus: data.subscriptionStatus as "ACTIVE" | "EXPIRED" | "TRIAL" | "NONE" | null,
        subscriptionEnd: data.subscriptionEnd,
        planSlug: data.planSlug,
        ...(data.questionsAsked !== undefined && { questionsAsked: data.questionsAsked }),
      }));
    });

    // ── Global incoming call listener ──────────────────────────
    channel.bind(CALL_INCOMING_EVENT, (data: IncomingCallPayload) => {
      setIncomingCalls((prev) => enqueueIncomingCall(prev, data));
    });

    // ── Call lifecycle events (for outgoing calls we initiated) ─
    channel.bind(CALL_ACCEPTED_EVENT, (data: { callSessionId: string }) => {
      setOutgoingAcceptedCallId(data.callSessionId);
    });

    channel.bind(CALL_REJECTED_EVENT, (data: { callSessionId: string }) => {
      setOutgoingRejectedCallId(data.callSessionId);
    });

    // Caller cancelled before pickup — clear matching incoming call
    channel.bind(CALL_CANCELLED_EVENT, (data: { callSessionId: string }) => {
      removeIncomingCall(data.callSessionId);
    });

    channel.bind(CALL_MISSED_EVENT, (data: { callSessionId: string }) => {
      removeIncomingCall(data.callSessionId);
      setOutgoingMissedCallId(data.callSessionId);
    });

    return () => {
      channel.unbind(CHANNEL_UPDATED_EVENT);
      channel.unbind(NEW_CHANNEL_EVENT);
      channel.unbind(CALL_INCOMING_EVENT);
      channel.unbind(CALL_ACCEPTED_EVENT);
      channel.unbind(CALL_REJECTED_EVENT);
      channel.unbind(CALL_CANCELLED_EVENT);
      channel.unbind(CALL_MISSED_EVENT);
      pusherClient.unsubscribe(userChannel);
    };
  }, [user.id, dispatch, removeIncomingCall]);

  useEffect(() => {
    const pusherClient = getPusherClient();
    if (!pusherClient) return;

    const channel = pusherClient.subscribe(PLATFORM_UPDATES_CHANNEL);
    const handleSocialLinksUpdated = (data: { socialLinks?: PlatformSocialLinks }) => {
      if (Array.isArray(data.socialLinks)) {
        setLiveSocialLinks(data.socialLinks);
      }
    };

    channel.bind(PLATFORM_SOCIAL_LINKS_UPDATED_EVENT, handleSocialLinksUpdated);

    return () => {
      channel.unbind(PLATFORM_SOCIAL_LINKS_UPDATED_EVENT, handleSocialLinksUpdated);
      pusherClient.unsubscribe(PLATFORM_UPDATES_CHANNEL);
    };
  }, []);

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
      questionsRemaining: null,
      maxQuestions: 0,
      baseMaxQuestions: 0,
      bonusQuestions: 0,
      referralCode: null,
      callSettings: user.callSettings || DEFAULT_CALL_SETTINGS,
    }));
  }, [
    dispatch,
    user.callSettings,
    user.email,
    user.id,
    user.name,
    user.role,
    user.userImage,
    user.username,
  ]);

  // ── Listen for outgoing call requests from channel-chat ────────
  useEffect(() => {
    const handleOutgoingCall = (e: Event) => {
      const detail = (e as CustomEvent<OutgoingCallState>).detail;
      if (detail?.callSessionId) {
        setOutgoingCall(detail);
        setOutgoingAcceptedCallId(null);
        setOutgoingRejectedCallId(null);
        setOutgoingMissedCallId(null);
      }
    };
    window.addEventListener("qc:outgoing-call", handleOutgoingCall);
    return () => window.removeEventListener("qc:outgoing-call", handleOutgoingCall);
  }, []);

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
  const resolvedCallSettings = profile.isHydrated
    ? profile.callSettings
    : user.callSettings || DEFAULT_CALL_SETTINGS;
  const activeIncomingCall = incomingCalls[0] ?? null;

  const handle = getUserHandle(resolvedUser);
  const leaderboardHref = getLeaderboardPath(resolvedUser);
  const messageHref = getMessagesPath(resolvedUser);
  const profileHref = getProfilePath(resolvedUser);
  const settingsHref = getSettingsPath(resolvedUser);
  const subscriptionHref = getSubscriptionPath(resolvedUser);
  const walletHref = getWalletPath(resolvedUser);
  const showQuestionFilter = pathname === "/";
  const isChatPage = pathname.startsWith("/message") || pathname.startsWith("/channel/");

  // Keep Post Question button in header for students, but open messages for teachers
  const headerPrimaryHref = resolvedUser.role === "STUDENT" ? "#" : messageHref;
  const headerPrimaryLabel = resolvedUser.role === "STUDENT" ? "Post Question" : "Open messages";
  const headerUseModal = resolvedUser.role === "STUDENT";

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
          isActive: pathname.startsWith("/courses") && !pathname.startsWith("/courses/my"),
          collapseSidebarOnClick: true,
        },
        {
          href: "/studio",
          icon: GraduationCapIcon,
          label: "Course Studio",
          badge: null,
          badgeClassName: undefined,
          isActive: pathname.startsWith("/studio"),
          collapseSidebarOnClick: true,
        }]
      : []),
  ] as const;

  const roleLabel = resolvedUser.role === "STUDENT" ? "Student" : "Teacher";
  const roleSummary =
    resolvedUser.role === "STUDENT"
      ? "Ask doubts, follow answers, and manage your learning flow."
      : "Track question activity, channel updates, and reputation from one place.";
  const isSidebarLoading = !hasCompletedInitialSidebarLoad;

  return (
    <WorkspaceFilterProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-2">
            {isSidebarLoading ? (
              <WorkspaceSidebarHeaderSkeleton />
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/75 p-2 shadow-sm group-data-[collapsible=icon]:justify-center">
                <div className="shrink-0">
                  <LogoMark size={32} className="rounded-lg" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                  <h1 className="truncate text-sm font-bold text-sidebar-foreground">{APP_NAME}</h1>
                  <p className="truncate text-xs text-sidebar-foreground/70">@{handle}</p>
                </div>
              </div>
            )}
          </SidebarHeader>

          <SidebarSeparator />

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigate</SidebarGroupLabel>
              <SidebarGroupContent>
                {isSidebarLoading ? (
                  <WorkspaceSidebarNavigationSkeleton />
                ) : (
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
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Mode</SidebarGroupLabel>
              <SidebarGroupContent>
                {isSidebarLoading ? (
                  <WorkspaceSidebarModeSkeleton />
                ) : (
                  <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/70 p-3 text-xs leading-6 text-sidebar-foreground/85 shadow-sm group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2 text-sidebar-foreground">
                      <SparklesIcon className="size-4" />
                      <span className="font-medium">{roleLabel} mode</span>
                    </div>
                    <p className="mt-2">{roleSummary}</p>
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <NavUser
              loading={isSidebarLoading}
              user={{
                name: resolvedUser.name || roleLabel,
                email: resolvedUser.email || "",
                userImage: resolvedUser.userImage || "",
              }}
            />
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset
          className={cn(
            "flex flex-col bg-[#f6f8fb] dark:bg-background",
            isChatPage ? "h-svh overflow-hidden" : "min-h-svh",
          )}
        >
          <AuthenticatedHeader
            isScrolled={isScrolled}
            primaryHref={headerPrimaryHref}
            primaryLabel={headerPrimaryLabel}
            showQuizLink={resolvedUser.role === "STUDENT"}
            showQuestionFilter={showQuestionFilter}
            useModalForPrimary={headerUseModal}
            socialLinks={liveSocialLinks}
            userId={resolvedUser.id}
          />

          <div
            className={cn(
              "flex flex-1 flex-col",
              isChatPage ? "overflow-hidden" : "gap-6 px-4 py-6 lg:px-6",
            )}
          >
            {children}
          </div>
        </SidebarInset>

        {/* ── Global call overlays (mounted outside sidebar) ─── */}
        <IncomingCallOverlay
          call={activeIncomingCall}
          onDismiss={() => removeIncomingCall(activeIncomingCall?.callSessionId)}
          isSilent={resolvedCallSettings.silentIncomingCalls}
          ringtone={resolvedCallSettings.incomingRingtone}
        />
        <OutgoingCallOverlay
          call={outgoingCall}
          onDismiss={() => {
            setOutgoingCall(null);
            setOutgoingAcceptedCallId(null);
            setOutgoingRejectedCallId(null);
            setOutgoingMissedCallId(null);
          }}
          wasAccepted={outgoingAcceptedCallId === outgoingCall?.callSessionId}
          wasRejected={outgoingRejectedCallId === outgoingCall?.callSessionId}
          wasMissed={outgoingMissedCallId === outgoingCall?.callSessionId}
          ringbackTone={resolvedCallSettings.outgoingRingtone}
        />
      </SidebarProvider>
    </WorkspaceFilterProvider>
  );
}

