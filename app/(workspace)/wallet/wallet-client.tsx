"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ClockIcon,
  CoinsIcon,
  CreditCardIcon,
  Loader2Icon,
  SendIcon,
  ShieldCheckIcon,
  StarIcon,
  TrendingUpIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatPoints } from "@/lib/points";

type WithdrawalHistoryItem = {
  _id: string;
  pointsRequested: number;
  nprEquivalent: number;
  esewaNumber: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  transactionId: string | null;
  amountSent: number | null;
  processedAt: string | null;
  adminNote: string | null;
  createdAt: string;
};

type WalletData = {
  role: "STUDENT" | "TEACHER";
  pointBalance: number;
  nprEquivalent: number;
  totalAnswered: number;
  isMonetized: boolean;
  overallScore: string;
  pointToNprRate: number;
  minWithdrawalPoints: number;
  qualificationThreshold: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED" | "NONE" | null;
  subscriptionEnd: string | null;
  questionsAsked: number;
  withdrawalHistory: WithdrawalHistoryItem[];
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

export function WalletClient() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pointsToWithdraw, setPointsToWithdraw] = useState("");
  const [esewaNumber, setEsewaNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wallet");

      if (!res.ok) {
        throw new Error("Failed to fetch wallet data");
      }

      const data = (await res.json()) as WalletData;
      setWallet(data);
      setError(null);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(false);

    const points = Number.parseFloat(pointsToWithdraw);

    if (!points || points <= 0) {
      setWithdrawError("Enter a valid number of points.");
      return;
    }

    if (!esewaNumber.trim()) {
      setWithdrawError("Enter your eSewa number.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointsRequested: points,
          esewaNumber: esewaNumber.trim(),
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      setWithdrawSuccess(true);
      setPointsToWithdraw("");
      setEsewaNumber("");
      await fetchWallet();
    } catch (submitError) {
      setWithdrawError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertCircleIcon className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error || "Failed to load wallet"}
        </p>
        <Button variant="outline" size="sm" onClick={fetchWallet}>
          Retry
        </Button>
      </div>
    );
  }

  const isTeacher = wallet.role === "TEACHER";
  const hasPendingRequest = wallet.withdrawalHistory.some(
    (request) => request.status === "PENDING",
  );
  const withdrawalUnlocked = isTeacher ? wallet.isMonetized : true;
  const qualificationProgress = wallet.qualificationThreshold
    ? Math.min(100, (wallet.totalAnswered / wallet.qualificationThreshold) * 100)
    : 0;
  const nprPreview =
    Number.parseFloat(pointsToWithdraw) * wallet.pointToNprRate || 0;
  const subscriptionStatusLabel =
    wallet.subscriptionStatus === "ACTIVE"
      ? "Active"
      : wallet.subscriptionStatus === "TRIAL"
        ? "Trial"
        : wallet.subscriptionStatus === "EXPIRED"
          ? "Expired"
          : "Not active";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          <WalletIcon className="mr-2 inline-block size-6 text-primary" />
          Wallet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isTeacher
            ? "Track your earned points, performance, and withdrawal requests."
            : "Track your points, subscription status, and withdrawal requests."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<CoinsIcon className="size-5 text-primary" />}
          iconClassName="bg-primary/10"
          title="Point Balance"
          value={`${formatPoints(wallet.pointBalance)} pts`}
          cardClassName="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
        />
        <SummaryCard
          icon={
            <BanknoteIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
          }
          iconClassName="bg-emerald-500/10"
          title="NPR Equivalent"
          value={`NPR ${wallet.nprEquivalent.toFixed(2)}`}
          cardClassName="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10"
        />
        {isTeacher ? (
          <>
            <SummaryCard
              icon={
                <StarIcon className="size-5 text-amber-600 dark:text-amber-400" />
              }
              iconClassName="bg-amber-500/10"
              title="Avg Rating"
              value={`${wallet.overallScore} / 5`}
              cardClassName="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10"
            />
            <SummaryCard
              icon={
                <TrendingUpIcon className="size-5 text-violet-600 dark:text-violet-400" />
              }
              iconClassName="bg-violet-500/10"
              title="Total Answers"
              value={`${wallet.totalAnswered}`}
              cardClassName="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-violet-500/10"
            />
          </>
        ) : (
          <>
            <SummaryCard
              icon={
                <CreditCardIcon className="size-5 text-sky-600 dark:text-sky-400" />
              }
              iconClassName="bg-sky-500/10"
              title="Subscription"
              value={subscriptionStatusLabel}
              cardClassName="border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-sky-500/10"
            />
            <SummaryCard
              icon={
                <TrendingUpIcon className="size-5 text-violet-600 dark:text-violet-400" />
              }
              iconClassName="bg-violet-500/10"
              title="Questions Asked"
              value={`${wallet.questionsAsked}`}
              cardClassName="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-violet-500/10"
            />
          </>
        )}
      </div>

      {isTeacher ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="pt-5">
            {wallet.isMonetized ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <ShieldCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Monetization Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your answer points are ready to cash out through the shared wallet flow.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-4 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">
                      Qualification Progress
                    </span>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {wallet.totalAnswered} / {wallet.qualificationThreshold} answers
                  </span>
                </div>
                <Progress value={qualificationProgress} />
                <p className="text-xs text-muted-foreground">
                  Complete {wallet.qualificationThreshold} answers to unlock withdrawals.
                  {wallet.qualificationThreshold - wallet.totalAnswered > 0
                    ? ` ${wallet.qualificationThreshold - wallet.totalAnswered} more to go.`
                    : ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>
              Subscription plans stay on their own student route, while your points and withdrawals live here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Status: {subscriptionStatusLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {wallet.subscriptionEnd
                  ? `Access runs until ${new Date(wallet.subscriptionEnd).toLocaleDateString()}.`
                  : "Choose a plan when you are ready to renew or upgrade."}
              </p>
            </div>
            <Button asChild>
              <Link href="/subscription">Manage Subscription</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Request Withdrawal</CardTitle>
          <CardDescription>
            Minimum withdrawal: {formatPoints(wallet.minWithdrawalPoints)} pts. Conversion rate:{" "}
            {wallet.pointToNprRate} NPR per point.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!withdrawalUnlocked ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <AlertCircleIcon className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Teacher withdrawals unlock after you complete {wallet.qualificationThreshold} answers.
              </p>
            </div>
          ) : hasPendingRequest ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <ClockIcon className="size-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Pending Request
                </p>
                <p className="text-xs text-muted-foreground">
                  You already have a pending withdrawal request. Wait for admin to process it before creating another one.
                </p>
              </div>
            </div>
          ) : wallet.pointBalance < wallet.minWithdrawalPoints ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <AlertCircleIcon className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You need at least {formatPoints(wallet.minWithdrawalPoints)} points to withdraw. You currently have {formatPoints(wallet.pointBalance)} points.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Points to withdraw
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={wallet.minWithdrawalPoints}
                    max={wallet.pointBalance}
                    placeholder={`Min ${formatPoints(wallet.minWithdrawalPoints)}`}
                    value={pointsToWithdraw}
                    onChange={(e) => setPointsToWithdraw(e.target.value)}
                    required
                  />
                  {nprPreview > 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      You will receive NPR {nprPreview.toFixed(2)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Your eSewa number
                  </label>
                  <Input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={esewaNumber}
                    onChange={(e) => setEsewaNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              {withdrawError ? (
                <p className="text-sm text-destructive">{withdrawError}</p>
              ) : null}
              {withdrawSuccess ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Withdrawal request submitted. Admin will process it shortly.
                </p>
              ) : null}

              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                Request Withdrawal
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Withdrawal History</CardTitle>
          <CardDescription>
            Track all of your withdrawal requests and their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wallet.withdrawalHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No withdrawal requests yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Points</th>
                    <th className="px-3 py-3">NPR</th>
                    <th className="px-3 py-3">eSewa</th>
                    <th className="px-3 py-3">Txn ID</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.withdrawalHistory.map((request) => (
                    <tr
                      key={request._id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">
                        {formatPoints(request.pointsRequested)}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {request.nprEquivalent.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {request.esewaNumber}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {request.transactionId || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <WithdrawalStatusBadge status={request.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  iconClassName,
  cardClassName,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  iconClassName: string;
  cardClassName: string;
}) {
  return (
    <Card className={cardClassName}>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${iconClassName}`}>{icon}</div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WithdrawalStatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2Icon className="size-3" />
        Completed
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
        <XCircleIcon className="size-3" />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <ClockIcon className="size-3" />
      Pending
    </span>
  );
}
