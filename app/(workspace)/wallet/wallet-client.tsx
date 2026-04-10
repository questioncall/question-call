"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CoinsIcon,
  BanknoteIcon,
  StarIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  WalletIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  Loader2Icon,
  AlertCircleIcon,
  SendIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

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
  pointBalance: number;
  nprEquivalent: number;
  totalAnswered: number;
  isMonetized: boolean;
  overallScore: string;
  pointToNprRate: number;
  minWithdrawalPoints: number;
  qualificationThreshold: number;
  withdrawalHistory: WithdrawalHistoryItem[];
};

export function WalletClient() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Withdraw form
  const [pointsToWithdraw, setPointsToWithdraw] = useState("");
  const [esewaNumber, setEsewaNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet data");
      const data = await res.json();
      setWallet(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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

    const points = parseInt(pointsToWithdraw, 10);
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");

      setWithdrawSuccess(true);
      setPointsToWithdraw("");
      setEsewaNumber("");
      await fetchWallet();
    } catch (err: any) {
      setWithdrawError(err.message);
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
        <p className="text-sm text-muted-foreground">{error || "Failed to load wallet"}</p>
        <Button variant="outline" size="sm" onClick={fetchWallet}>Retry</Button>
      </div>
    );
  }

  const hasPendingRequest = wallet.withdrawalHistory.some(
    (w) => w.status === "PENDING"
  );

  const qualificationProgress = Math.min(
    100,
    (wallet.totalAnswered / wallet.qualificationThreshold) * 100
  );

  const nprPreview = parseInt(pointsToWithdraw, 10) * wallet.pointToNprRate || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          <WalletIcon className="mr-2 inline-block size-6 text-primary" />
          Your Wallet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your points, earnings, and withdrawal requests.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <CoinsIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Point Balance
                </p>
                <p className="text-xl font-bold text-foreground">
                  {wallet.pointBalance} pts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <BanknoteIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  NPR Equivalent
                </p>
                <p className="text-xl font-bold text-foreground">
                  NPR {wallet.nprEquivalent}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <StarIcon className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Avg Rating
                </p>
                <p className="text-xl font-bold text-foreground">
                  {wallet.overallScore} / 5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-violet-500/10">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-500/10 p-2.5">
                <TrendingUpIcon className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Answers
                </p>
                <p className="text-xl font-bold text-foreground">
                  {wallet.totalAnswered}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monetization Status */}
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
                  You earn points for every answer. Keep going!
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
                Complete {wallet.qualificationThreshold} answers to unlock earnings.
                {wallet.qualificationThreshold - wallet.totalAnswered > 0 &&
                  ` ${wallet.qualificationThreshold - wallet.totalAnswered} more to go!`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Section */}
      {wallet.isMonetized && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Request Withdrawal</CardTitle>
            <CardDescription>
              Minimum withdrawal: {wallet.minWithdrawalPoints} pts · Rate: {wallet.pointToNprRate} NPR/pt
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPendingRequest ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <ClockIcon className="size-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Pending Request
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You have a pending withdrawal request. Wait for admin to process it before requesting again.
                  </p>
                </div>
              </div>
            ) : wallet.pointBalance < wallet.minWithdrawalPoints ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <AlertCircleIcon className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You need at least {wallet.minWithdrawalPoints} points to withdraw. 
                  Currently you have {wallet.pointBalance} points.
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
                      min={wallet.minWithdrawalPoints}
                      max={wallet.pointBalance}
                      placeholder={`Min ${wallet.minWithdrawalPoints}`}
                      value={pointsToWithdraw}
                      onChange={(e) => setPointsToWithdraw(e.target.value)}
                      required
                    />
                    {nprPreview > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        You will receive: NPR {nprPreview}
                      </p>
                    )}
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

                {withdrawError && (
                  <p className="text-sm text-destructive">{withdrawError}</p>
                )}
                {withdrawSuccess && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    ✅ Withdrawal request submitted! Admin will process it shortly.
                  </p>
                )}

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
      )}

      {/* Withdrawal History */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Withdrawal History</CardTitle>
          <CardDescription>
            Track all your withdrawal requests and their status.
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
                  {wallet.withdrawalHistory.map((w) => (
                    <tr
                      key={w._id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">
                        {w.pointsRequested}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {w.nprEquivalent}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {w.esewaNumber}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {w.transactionId || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <WithdrawalStatusBadge status={w.status} />
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
