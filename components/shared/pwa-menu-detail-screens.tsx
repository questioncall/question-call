"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  ClipboardIcon,
  FlagIcon,
  GiftIcon,
  KeyIcon,
  Loader2Icon,
  MegaphoneIcon,
  MoonIcon,
  PlayCircleIcon,
  ReceiptTextIcon,
  Settings2Icon,
  SunIcon,
  TrophyIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeVideo } from "@/components/shared/notice-video";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

type ShellProps = {
  title: string;
  children: React.ReactNode;
};

function PwaDetailShell({ title, children }: ShellProps) {
  const router = useRouter();

  return (
    <div className="pwa-pushed-screen min-h-svh bg-[#f4f6f8] dark:bg-background">
      <header
        className="pwa-pushed-header sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex size-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-base font-bold">
            {title}
          </p>
          <Link
            href="/menu"
            className="flex size-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
        <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        {children}
      </main>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BellIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 text-center shadow-sm">
      <Icon className="mx-auto mb-3 size-9 text-muted-foreground" />
      <p className="text-base font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type NotificationItem = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  href?: string | null;
  createdAt: string;
};

export function PwaNotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/notifications");
        const data = (await response.json()) as NotificationItem[] | { error?: string };
        if (isMounted && Array.isArray(data)) {
          setItems(data);
        }
      } catch {
        if (isMounted) toast.error("Unable to load notifications");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PwaDetailShell title="Notification Center">
      {isLoading ? (
        <LoadingCard label="Loading notifications..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellIcon}
          title="No notifications"
          body="Recent updates and alerts will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          {items.map((item, index) => {
            const row = (
              <div
                className={cn(
                  "flex gap-3 p-4",
                  !item.isRead && "bg-emerald-500/5",
                  index > 0 && "border-t border-border",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-2.5 rounded-full",
                    item.isRead ? "bg-muted" : "bg-emerald-500",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.type.replaceAll("_", " ")} · {formatTime(item.createdAt)}
                  </p>
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href}>
                {row}
              </Link>
            ) : (
              <div key={item.id}>{row}</div>
            );
          })}
        </div>
      )}
    </PwaDetailShell>
  );
}

type NoticeItem = {
  _id: string;
  title: string;
  body: string;
  type: "ADVERTISEMENT" | "GENERAL" | "SPECIAL";
  imageUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: string;
};

export function PwaNoticesScreen() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notices");
      const data = (await response.json()) as NoticeItem[] | { error?: string };
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch {
      toast.error("Unable to load notices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dismissNotice = async (id: string) => {
    setItems((current) => current.filter((item) => item._id !== id));
    try {
      await fetch(`/api/notices/${id}/dismiss`, { method: "POST" });
      toast.success("Notice marked as seen");
    } catch {
      toast.error("Could not dismiss notice");
      void load();
    }
  };

  return (
    <PwaDetailShell title="Notices">
      {isLoading ? (
        <LoadingCard label="Loading notices..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MegaphoneIcon}
          title="No notices"
          body="Announcements and platform updates will appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((notice) => (
            <article
              key={notice._id}
              className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
            >
              {notice.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={notice.imageUrl}
                  alt={notice.title}
                  className="h-44 w-full object-cover"
                />
              ) : notice.videoUrl ? (
                <NoticeVideo src={notice.videoUrl} className="aspect-video w-full" />
              ) : null}
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-600">
                    {notice.type}
                  </p>
                  <h2 className="mt-1 text-base font-bold">{notice.title}</h2>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {notice.body}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => dismissNotice(notice._id)}
                >
                  Mark as seen
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </PwaDetailShell>
  );
}

type ReferralStats = {
  referralCode: string | null;
  bonusQuestions: number;
  totalReferred: number;
  totalBonusEarned: number;
  referrals: {
    _id: string;
    refereeName: string;
    bonus: number;
    date: string;
    status: string;
  }[];
};

export function PwaReferralScreen() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/user/referral");
        const data = (await response.json()) as ReferralStats | { error?: string };
        if (isMounted && "referrals" in data) {
          setStats(data);
        }
      } catch {
        if (isMounted) toast.error("Unable to load referrals");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const referralLink = useMemo(() => {
    if (!stats?.referralCode || typeof window === "undefined") return null;
    return `${window.location.origin}/auth/signup?ref=${stats.referralCode}`;
  }, [stats?.referralCode]);

  const copyReferral = async () => {
    const value = referralLink || stats?.referralCode;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Referral copied");
  };

  return (
    <PwaDetailShell title="Referrals">
      {isLoading ? (
        <LoadingCard label="Loading referrals..." />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <GiftIcon className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referral code</p>
                <p className="text-2xl font-black tracking-wide">
                  {stats?.referralCode || "Not generated"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="mt-4 w-full gap-2"
              disabled={!stats?.referralCode}
              onClick={copyReferral}
            >
              <ClipboardIcon className="size-4" />
              Copy invite
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Friends" value={stats?.totalReferred ?? 0} />
            <StatTile label="Bonus" value={stats?.totalBonusEarned ?? 0} />
            <StatTile label="Questions" value={stats?.bonusQuestions ?? 0} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            {(stats?.referrals ?? []).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Completed referrals will appear here.
              </p>
            ) : (
              stats?.referrals.map((item, index) => (
                <div
                  key={item._id}
                  className={cn("p-4", index > 0 && "border-t border-border")}
                >
                  <p className="font-semibold">{item.refereeName}</p>
                  <p className="text-xs text-muted-foreground">
                    +{item.bonus} bonus · {formatTime(item.date)}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </PwaDetailShell>
  );
}

type NotificationPrefs = {
  questions: boolean;
  chat: boolean;
  wallet: boolean;
  announcements: boolean;
};

const PREF_LABELS: { key: keyof NotificationPrefs; title: string; body: string }[] = [
  { key: "questions", title: "Questions", body: "Accepted answers and deadlines" },
  { key: "chat", title: "Chat", body: "Channel updates and messages" },
  { key: "wallet", title: "Wallet", body: "Payments, rewards, and withdrawals" },
  { key: "announcements", title: "Announcements", body: "Notices and platform updates" },
];

export function PwaNotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/users/notification-prefs");
        const data = (await response.json()) as {
          notificationPrefs?: NotificationPrefs;
        };
        if (isMounted) {
          setPrefs(
            data.notificationPrefs ?? {
              questions: true,
              chat: true,
              wallet: true,
              announcements: true,
            },
          );
        }
      } catch {
        if (isMounted) toast.error("Unable to load notification settings");
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggle = async (key: keyof NotificationPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setIsSaving(true);

    try {
      const response = await fetch("/api/users/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Failed to save");
      toast.success("Notification settings saved");
    } catch {
      setPrefs(prefs);
      toast.error("Unable to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PwaDetailShell title="Notification Settings">
      {!prefs ? (
        <LoadingCard label="Loading settings..." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          {PREF_LABELS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              className={cn(
                "flex w-full items-center justify-between gap-3 p-4 text-left",
                index > 0 && "border-t border-border",
              )}
            >
              <span>
                <span className="block text-sm font-bold">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.body}</span>
              </span>
              <span
                className={cn(
                  "flex h-7 w-12 items-center rounded-full p-1 transition",
                  prefs[item.key] ? "bg-emerald-500" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "size-5 rounded-full bg-white shadow transition",
                    prefs[item.key] && "translate-x-5",
                  )}
                />
              </span>
            </button>
          ))}
        </div>
      )}
      {isSaving ? <p className="text-center text-xs text-muted-foreground">Saving...</p> : null}
    </PwaDetailShell>
  );
}

export function PwaThemeScreen() {
  const { setTheme, theme } = useTheme();
  const options = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: Settings2Icon },
  ] as const;

  return (
    <PwaDetailShell title="Theme">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex w-full items-center justify-between gap-3 p-4 text-left",
              index > 0 && "border-t border-border",
            )}
          >
            <span className="flex items-center gap-3">
              <option.icon className="size-5 text-muted-foreground" />
              <span className="font-semibold">{option.label}</span>
            </span>
            {theme === option.value ? <CheckIcon className="size-5 text-emerald-500" /> : null}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span>
            <span className="block text-sm font-bold">Quick toggle</span>
            <span className="block text-xs text-muted-foreground">Switch light and dark</span>
          </span>
          <ThemeToggle />
        </div>
      </div>
    </PwaDetailShell>
  );
}

export function PwaChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Failed to update password");
      setCurrentPassword("");
      setNewPassword("");
      toast.success(data.message || "Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PwaDetailShell title="Change Password">
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={isSaving}>
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <KeyIcon className="size-4" />}
          Update password
        </Button>
      </form>
    </PwaDetailShell>
  );
}

type OnboardingVideoResponse = {
  shouldShow: boolean;
  role: string;
  video?: {
    title?: string;
    description?: string;
    videoUrl?: string;
    url?: string;
  } | null;
};

export function PwaOnboardingScreen() {
  const [data, setData] = useState<OnboardingVideoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/onboarding-video");
        const json = (await response.json()) as OnboardingVideoResponse;
        if (isMounted) setData(json);
      } catch {
        if (isMounted) toast.error("Unable to load onboarding video");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const videoUrl = data?.video?.videoUrl || data?.video?.url;

  return (
    <PwaDetailShell title="Onboarding Videos">
      {isLoading ? (
        <LoadingCard label="Loading onboarding..." />
      ) : videoUrl ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <NoticeVideo src={videoUrl} className="aspect-video w-full" />
          <div className="p-4">
            <p className="text-base font-bold">
              {data?.video?.title || `${data?.role ?? "User"} onboarding`}
            </p>
            {data?.video?.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {data.video.description}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={PlayCircleIcon}
          title="No video available"
          body="Onboarding videos assigned by admins will appear here."
        />
      )}
    </PwaDetailShell>
  );
}

export function PwaDailyTargetScreen({
  dailyAnswersCount,
}: {
  dailyAnswersCount: number;
}) {
  const target = Math.max(10, dailyAnswersCount);
  const progress = Math.min(100, Math.round((dailyAnswersCount / target) * 100));

  return (
    <PwaDetailShell title="Daily Target">
      <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <FlagIcon className="size-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Answers today</p>
            <p className="text-3xl font-black">{dailyAnswersCount}</p>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep answering accepted questions to move toward your daily target.
        </p>
      </div>
    </PwaDetailShell>
  );
}

export function PwaActivityScreen({
  totalAnswered,
  dailyAnswersCount,
}: {
  totalAnswered: number;
  dailyAnswersCount: number;
}) {
  return (
    <PwaDetailShell title="My Activity">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Answered" value={totalAnswered} icon={TrophyIcon} />
        <StatTile label="Today" value={dailyAnswersCount} icon={FlagIcon} />
      </div>
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <p className="text-sm font-bold">Recent activity</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your question, answer, note, and wallet activity links are available from the app menu.
        </p>
      </div>
    </PwaDetailShell>
  );
}

export function PwaWithdrawScreen() {
  return (
    <PwaDetailShell title="Withdraw">
      <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <WalletIcon className="size-6" />
          </div>
          <div>
            <p className="text-base font-bold">Transfer to eSewa</p>
            <p className="text-sm text-muted-foreground">
              Withdrawals are managed from your wallet balance.
            </p>
          </div>
        </div>
        <Button asChild className="mt-4 w-full">
          <Link href="/wallet">Open wallet</Link>
        </Button>
      </div>
    </PwaDetailShell>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground shadow-sm">
      <Loader2Icon className="size-4 animate-spin" />
      {label}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon = ReceiptTextIcon,
}: {
  label: string;
  value: number;
  icon?: typeof ReceiptTextIcon;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <Icon className="mb-2 size-5 text-emerald-600" />
      <p className="text-2xl font-black">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
