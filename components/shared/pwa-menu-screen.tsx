"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3Icon,
  BellIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  FileTextIcon,
  FlagIcon,
  GiftIcon,
  GraduationCapIcon,
  KeyIcon,
  Loader2Icon,
  LogOutIcon,
  MegaphoneIcon,
  MoonIcon,
  PhoneIcon,
  PlayCircleIcon,
  ReceiptTextIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
  TrophyIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getLeaderboardPath,
  getProfilePath,
  getSignOutPath,
} from "@/lib/user-paths";
import { useAppSelector } from "@/store/hooks";

type PwaMenuScreenProps = {
  dailyAnswersCount?: number;
};

type WalletSummary = {
  pointBalance?: number;
  nprEquivalent?: number;
  pointToNprRate?: number;
};

type MenuItemProps = {
  href?: string;
  icon: typeof UserIcon;
  label: string;
  subtitle?: string;
  badge?: string;
  danger?: boolean;
  onClick?: () => void;
};

const planNameMap: Record<string, string> = {
  free: "Trial",
  go: "GO",
  plus: "Plus",
  pro: "Pro",
  max: "Max",
};

function formatNumber(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

export function PwaMenuScreen({ dailyAnswersCount = 0 }: PwaMenuScreenProps) {
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isTeacher = user.role === "TEACHER";
  const displayName = user.name || "Loading...";
  const profileHref = getProfilePath(user);
  const planName = user.planSlug ? planNameMap[user.planSlug] || user.planSlug : "Free";
  const pointBalance = wallet?.pointBalance ?? 0;
  const nprEquivalent = wallet?.nprEquivalent ?? pointBalance * (wallet?.pointToNprRate ?? 1);

  useEffect(() => {
    let cancelled = false;

    const loadWallet = async () => {
      try {
        const response = await fetch("/api/wallet?limit=1&skip=0");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as WalletSummary;
        if (!cancelled) {
          setWallet(data);
        }
      } catch {
        // Wallet is a nice-to-have summary on this screen.
      }
    };

    void loadWallet();

    return () => {
      cancelled = true;
    };
  }, []);

  const initials = useMemo(() => {
    const source = displayName || user.email || "U";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  }, [displayName, user.email]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: "DELETE",
          password: deletePassword || undefined,
          reason: deleteReason || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not delete your account.");
      }

      toast.success("Account deletion started.");
      router.push(getSignOutPath());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete your account.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <main className="min-h-full bg-background pb-8">
        <div className="px-6 pb-2 pt-5">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Menu</h1>
        </div>

        <section className="mx-4 my-3 overflow-hidden rounded-[18px] rounded-br-none border bg-card shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />
            <div className="flex items-center px-4 pb-3 pt-4">
              {user.userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={displayName}
                  className="mr-3 size-14 rounded-full object-cover"
                  src={user.userImage}
                />
              ) : (
                <div className="mr-3 flex size-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-foreground">{displayName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase text-primary">
                    {user.role}
                  </span>
                  {!isTeacher ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                      {planName}
                    </span>
                  ) : null}
                </div>
              </div>

              <Button asChild size="sm" variant="secondary">
                <Link href={profileHref}>View</Link>
              </Button>
            </div>

            <div className="mx-4 h-px bg-emerald-500/20" />

            <div className="px-4 pb-4 pt-3">
              <p className="mb-1 text-xs text-muted-foreground">
                {isTeacher ? "Point Balance" : "Quiz Points"}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-[30px] font-black text-emerald-500">
                  {formatNumber(pointBalance)}
                </span>
                <span className="text-sm text-muted-foreground">pts</span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                NPR {formatNumber(nprEquivalent)}
              </p>
            </div>

            <div
              className="absolute bottom-0 right-0 size-0 border-b-[36px] border-l-[36px] border-b-emerald-500 border-l-transparent"
              aria-hidden="true"
            />
          </div>
        </section>

        <SectionHeader title="Profile" />
        <MenuGroup>
          <MenuItem href={profileHref} icon={UserIcon} label="My Profile" />
          <Divider />
          <MenuItem href="/profile/activity" icon={BarChart3Icon} label="My Activity" />
        </MenuGroup>

        <SectionHeader title="Wallet & Transactions" />
        <MenuGroup>
          <MenuItem
            href="/wallet"
            icon={WalletIcon}
            label="Wallet"
            subtitle={`${formatNumber(pointBalance)} pts · NPR ${formatNumber(nprEquivalent)}`}
          />
          {isTeacher ? (
            <>
              <Divider />
              <MenuItem
                href="/wallet/withdraw"
                icon={CircleDollarSignIcon}
                label="Withdraw"
                subtitle="Transfer to eSewa"
              />
            </>
          ) : null}
          <Divider />
          <MenuItem href="/wallet" icon={ReceiptTextIcon} label="Transaction History" />
          {isTeacher ? (
            <>
              <Divider />
              <MenuItem
                href="/daily-target"
                icon={FlagIcon}
                label="Daily Target"
                subtitle={`${dailyAnswersCount} answers today`}
              />
            </>
          ) : null}
        </MenuGroup>

        <SectionHeader title="Services" />
        <MenuGroup>
          {isTeacher ? (
            <>
              <MenuItem
                href="/studio"
                icon={GraduationCapIcon}
                label="Course Studio"
                subtitle="Manage your courses"
              />
              <Divider />
            </>
          ) : null}
          <MenuItem
            href="/notes"
            icon={FileTextIcon}
            label="Notes"
            subtitle="Study notes shared by students"
          />
          <Divider />
          <MenuItem href="/quiz" icon={SparklesIcon} label="AI Quizzes" subtitle="Test your knowledge" />
          <Divider />
          <MenuItem href={getLeaderboardPath(user)} icon={TrophyIcon} label="Leaderboard" />
          <Divider />
          <MenuItem
            href="/referral"
            icon={GiftIcon}
            label="Referrals"
            subtitle="Invite friends, earn bonus questions"
          />
          <Divider />
          <MenuItem href="/notices" icon={MegaphoneIcon} label="Notices" />
        </MenuGroup>

        <SectionHeader title="Account" />
        <MenuGroup>
          {!isTeacher ? (
            <>
              <MenuItem
                href="/subscription"
                icon={CircleDollarSignIcon}
                label="Subscription Plans"
                subtitle={`Current: ${planName.toUpperCase()}`}
              />
              <Divider />
            </>
          ) : null}
          <MenuItem
            href="/notifications"
            icon={BellIcon}
            label="Notification Center"
            subtitle="Recent updates and alerts"
          />
          <Divider />
          <MenuItem
            href="/settings/notifications"
            icon={Settings2Icon}
            label="Notification Settings"
            subtitle="Mute categories of push notifications"
          />
          <Divider />
          <MenuItem href="/settings/calls" icon={PhoneIcon} label="Call Settings" />
          <Divider />
          <MenuItem href="/onboarding" icon={PlayCircleIcon} label="Onboarding Videos" />
          <Divider />
          <MenuItem href="/legal" icon={FileTextIcon} label="Terms of Use" />
          <Divider />
          <MenuItem href="/privacy" icon={ShieldCheckIcon} label="Privacy Policy" />
          <Divider />
          <MenuItem href="/profile/change-password" icon={KeyIcon} label="Change Password" />
          <Divider />
          <MenuItem href="/settings/theme" icon={MoonIcon} label="Theme" />
        </MenuGroup>

        <SectionHeader title="Danger Zone" />
        <MenuGroup className="mb-8">
          <MenuItem
            href={getSignOutPath()}
            icon={LogOutIcon}
            label="Sign Out"
            danger
          />
          <Divider />
          <MenuItem
            icon={Trash2Icon}
            label="Delete Account"
            subtitle="Recoverable within 30 days"
            danger
            onClick={() => setIsDeleteOpen(true)}
          />
        </MenuGroup>
      </main>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Your account will be disabled immediately and recoverable for 30 days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Required for password accounts"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason</Label>
              <Textarea
                id="delete-reason"
                placeholder="Optional"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void handleDeleteAccount();
              }}
            >
              {isDeleting ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pb-2 pt-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
    </div>
  );
}

function MenuGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-4 overflow-hidden rounded-2xl border border-border bg-card", className)}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-4 h-px bg-border" />;
}

function MenuItem({
  href,
  icon: Icon,
  label,
  subtitle,
  badge,
  danger,
  onClick,
}: MenuItemProps) {
  const content = (
    <>
      <span
        className={cn(
          "mr-3 flex size-9 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-base font-medium",
            danger ? "text-red-500" : "text-foreground",
          )}
        >
          {label}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      {badge ? (
        <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      ) : null}
      <ChevronRightIcon
        className={cn("size-4 shrink-0", danger ? "text-red-500" : "text-muted-foreground")}
      />
    </>
  );

  const className =
    "flex w-full items-center px-4 py-3.5 text-left transition hover:bg-muted/40 active:bg-muted/60";

  if (href) {
    return (
      <Link className={className} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onClick} type="button">
      {content}
    </button>
  );
}
