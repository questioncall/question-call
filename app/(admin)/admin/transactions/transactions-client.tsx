"use client";

import { useEffect, useState } from "react";
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  FilterIcon,
  Loader2Icon,
  ReceiptTextIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type TransactionRecord = {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  type: string;
  amount: number;
  status: string;
  gateway?: string;
  transactionId?: string;
  transactorName?: string;
  planSlug?: string;
  screenshotUrl?: string;
  createdAt: string;
  meta?: {
    adminAction?: string;
    adminNote?: string | null;
    paymentChannel?: string;
  };
  metadata?: {
    courseName?: string;
    pricingModel?: string;
    grossAmount?: number;
    commissionPercent?: number;
    netAmount?: number;
    requestId?: string;
    pointsRequested?: number;
    nprEquivalent?: number;
    esewaNumber?: string;
    requesterRole?: string;
  };
};

type FinanceView = "LEDGER" | "SUMMARY";

type MoneyInRow = {
  id: string;
  createdAt: string;
  payerName: string;
  payerEmail: string;
  source: string;
  detail: string;
  grossAmount: number;
  platformKeeps: number;
  teacherShare: number;
  transactionId: string | null;
};

type MoneyOutRow = {
  id: string;
  createdAt: string;
  recipientName: string;
  recipientEmail: string;
  typeLabel: string;
  detail: string;
  amount: number;
  transactionId: string | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function isManualReviewTransaction(transaction: TransactionRecord | null) {
  return (
    transaction?.type === "SUBSCRIPTION_MANUAL" ||
    transaction?.type === "COURSE_PURCHASE"
  );
}

function getApproveDialogTitle(transaction: TransactionRecord | null) {
  return transaction?.type === "COURSE_PURCHASE"
    ? "Approve Course Purchase"
    : "Approve Manual Subscription";
}

function getApproveDialogDescription(transaction: TransactionRecord | null) {
  return transaction?.type === "COURSE_PURCHASE"
    ? `This will unlock ${transaction?.metadata?.courseName || "the course"} for ${transaction?.userId?.name}.`
    : `This will activate ${transaction?.userId?.name}'s subscription immediately.`;
}

function getRefundDialogDescription(transaction: TransactionRecord | null) {
  return transaction?.type === "COURSE_PURCHASE"
    ? "This keeps the course payment in history but does not unlock the course."
    : "This keeps the transaction in the history but does not activate the student's plan.";
}

function formatMoney(value: number | undefined | null) {
  return `NPR ${(value || 0).toFixed(2)}`;
}

function formatPlanLabel(planSlug?: string) {
  if (planSlug === "free") {
    return "Free Trial";
  }

  if (planSlug === "go") {
    return "GO Plan";
  }

  if (planSlug === "plus") {
    return "Plus Plan";
  }

  if (planSlug === "pro") {
    return "Pro Plan";
  }

  if (planSlug === "max") {
    return "Max Plan";
  }

  return planSlug || "—";
}

function getUserLabel(transaction: TransactionRecord) {
  return transaction.userId?.name || "Unknown";
}

function getUserEmail(transaction: TransactionRecord) {
  return transaction.userId?.email || "No email";
}

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [view, setView] = useState<FinanceView>("LEDGER");
  const [approveTarget, setApproveTarget] = useState<TransactionRecord | null>(null);
  const [refundTarget, setRefundTarget] = useState<TransactionRecord | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [acting, setActing] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/transactions");
      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTransactions();
  }, []);

  const filteredTxns = transactions.filter((transaction) =>
    filter === "ALL" ? true : transaction.type === filter,
  );

  const completedIncomingTransactions = transactions.filter(
    (transaction) =>
      transaction.status === "COMPLETED" &&
      (transaction.type === "SUBSCRIPTION_MANUAL" || transaction.type === "COURSE_PURCHASE"),
  );
  const distributedTransactions = transactions.filter(
    (transaction) =>
      transaction.status === "COMPLETED" &&
      (transaction.type === "COURSE_SALE_CREDIT" || transaction.type === "WITHDRAWAL"),
  );

  const moneyInRows: MoneyInRow[] = completedIncomingTransactions.map((transaction) => {
    const grossAmount = transaction.metadata?.grossAmount ?? transaction.amount;
    const teacherShare =
      transaction.type === "COURSE_PURCHASE"
        ? transaction.metadata?.netAmount ?? 0
        : 0;
    const platformKeeps =
      transaction.type === "COURSE_PURCHASE"
        ? grossAmount - teacherShare
        : transaction.amount;

    return {
      id: transaction._id,
      createdAt: transaction.createdAt,
      payerName: getUserLabel(transaction),
      payerEmail: getUserEmail(transaction),
      source:
        transaction.type === "COURSE_PURCHASE"
          ? "Course purchase"
          : "Manual subscription",
      detail:
        transaction.type === "COURSE_PURCHASE"
          ? transaction.metadata?.courseName || "Unknown course"
          : formatPlanLabel(transaction.planSlug),
      grossAmount,
      platformKeeps,
      teacherShare,
      transactionId: transaction.transactionId || null,
    };
  });

  const moneyOutRows: MoneyOutRow[] = distributedTransactions.map((transaction) => ({
    id: transaction._id,
    createdAt: transaction.createdAt,
    recipientName: getUserLabel(transaction),
    recipientEmail: getUserEmail(transaction),
    typeLabel:
      transaction.type === "COURSE_SALE_CREDIT"
        ? "Teacher course credit"
        : "Withdrawal payout",
    detail:
      transaction.type === "COURSE_SALE_CREDIT"
        ? transaction.metadata?.courseName || "Course revenue share"
        : transaction.metadata?.esewaNumber
          ? `eSewa ${transaction.metadata.esewaNumber}`
          : "Teacher wallet withdrawal",
    amount: transaction.amount,
    transactionId: transaction.transactionId || null,
  }));

  const financialSummary = {
    completedRevenue: moneyInRows.reduce((sum, transaction) => sum + transaction.grossAmount, 0),
    platformEarnings: moneyInRows.reduce((sum, transaction) => sum + transaction.platformKeeps, 0),
    teacherCoursePayouts: distributedTransactions
      .filter((transaction) => transaction.type === "COURSE_SALE_CREDIT")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    withdrawalsSent: distributedTransactions
      .filter((transaction) => transaction.type === "WITHDRAWAL")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    pendingReview: transactions
      .filter(
        (transaction) =>
          transaction.status === "PENDING" &&
          (transaction.type === "SUBSCRIPTION_MANUAL" ||
            transaction.type === "COURSE_PURCHASE"),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  };
  const totalDistributed =
    financialSummary.teacherCoursePayouts + financialSummary.withdrawalsSent;

  const earningsBySource = [
    {
      source: "Subscriptions",
      transactions: completedIncomingTransactions.filter(
        (transaction) => transaction.type === "SUBSCRIPTION_MANUAL",
      ).length,
      grossAmount: completedIncomingTransactions
        .filter((transaction) => transaction.type === "SUBSCRIPTION_MANUAL")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      platformKeeps: completedIncomingTransactions
        .filter((transaction) => transaction.type === "SUBSCRIPTION_MANUAL")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      teacherShare: 0,
    },
    {
      source: "Course commissions",
      transactions: completedIncomingTransactions.filter(
        (transaction) => transaction.type === "COURSE_PURCHASE",
      ).length,
      grossAmount: completedIncomingTransactions
        .filter((transaction) => transaction.type === "COURSE_PURCHASE")
        .reduce(
          (sum, transaction) => sum + (transaction.metadata?.grossAmount ?? transaction.amount),
          0,
        ),
      platformKeeps: completedIncomingTransactions
        .filter((transaction) => transaction.type === "COURSE_PURCHASE")
        .reduce((sum, transaction) => {
          const grossAmount = transaction.metadata?.grossAmount ?? transaction.amount;
          const teacherShare = transaction.metadata?.netAmount ?? 0;
          return sum + (grossAmount - teacherShare);
        }, 0),
      teacherShare: completedIncomingTransactions
        .filter((transaction) => transaction.type === "COURSE_PURCHASE")
        .reduce((sum, transaction) => sum + (transaction.metadata?.netAmount ?? 0), 0),
    },
  ];

  const openApproveModal = (transaction: TransactionRecord) => {
    setAdminNote("");
    setApproveTarget(transaction);
  };

  const openRefundModal = (transaction: TransactionRecord) => {
    setAdminNote("");
    setRefundTarget(transaction);
  };

  const handleApprove = async () => {
    if (!approveTarget) {
      return;
    }

    setActing(true);
    try {
      const res = await fetch(`/api/admin/transactions/${approveTarget._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: adminNote.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve transaction");
      }

      toast.success(
        approveTarget.type === "COURSE_PURCHASE"
          ? "Course purchase approved and access unlocked."
          : "Transaction approved and subscription activated.",
      );
      setApproveTarget(null);
      setAdminNote("");
      await fetchTransactions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) {
      return;
    }

    setActing(true);
    try {
      const res = await fetch(`/api/admin/transactions/${refundTarget._id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: adminNote.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to refund transaction");
      }

      toast.success(
        refundTarget.type === "COURSE_PURCHASE"
          ? "Course purchase marked as rejected."
          : "Transaction marked as refunded.",
      );
      setRefundTarget(null);
      setAdminNote("");
      await fetchTransactions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <ActivityIcon className="mr-2 inline-block size-6 text-primary" />
          Platform Transactions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep the raw ledger separate from the finance summary so approvals stay actionable and revenue stays readable.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={view === "LEDGER" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("LEDGER")}
        >
          Ledger
        </Button>
        <Button
          variant={view === "SUMMARY" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("SUMMARY")}
        >
          Finance Summary
        </Button>
      </div>

      {view === "LEDGER" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FilterIcon className="size-4 text-muted-foreground" />
            {([
              "ALL",
              "SUBSCRIPTION_MANUAL",
              "COURSE_PURCHASE",
              "COURSE_SALE_CREDIT",
              "CREDIT",
              "DEBIT",
              "WITHDRAWAL",
            ]).map((item) => (
              <Button
                key={item}
                variant={filter === item ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(item)}
              >
                {item === "ALL" ? "All" : item.replaceAll("_", " ")}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Completed Revenue"
              value={formatMoney(financialSummary.completedRevenue)}
              subtitle="Paid in by students"
            />
            <SummaryCard
              title="Platform Earnings"
              value={formatMoney(financialSummary.platformEarnings)}
              subtitle="Subscriptions + course commission"
            />
            <SummaryCard
              title="Teacher Course Credits"
              value={formatMoney(financialSummary.teacherCoursePayouts)}
              subtitle="Credited to instructors"
            />
            <SummaryCard
              title="Withdrawals Sent"
              value={formatMoney(financialSummary.withdrawalsSent)}
              subtitle="Cash paid out"
            />
            <SummaryCard
              title="Pending Review"
              value={formatMoney(financialSummary.pendingReview)}
              subtitle="Manual checks still open"
            />
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Transaction Ledger</CardTitle>
              <CardDescription>
                Total {filteredTxns.length} records with review actions kept in one place.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-max min-w-[1250px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTxns.map((transaction) => (
                      <tr key={transaction._id} className="transition-colors hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {getUserLabel(transaction)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getUserEmail(transaction)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <TransactionTypeLabel type={transaction.type} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatMoney(transaction.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <LedgerDetails transaction={transaction} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={transaction.status}
                            adminAction={transaction.meta?.adminAction}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {isManualReviewTransaction(transaction) &&
                          transaction.status === "PENDING" ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="h-8 gap-1"
                                onClick={() => openApproveModal(transaction)}
                              >
                                <ShieldCheckIcon className="size-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 gap-1"
                                onClick={() => openRefundModal(transaction)}
                              >
                                <RotateCcwIcon className="size-3.5" />
                                Refund
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredTxns.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Money In"
              value={formatMoney(financialSummary.completedRevenue)}
              subtitle="Approved student payments"
            />
            <SummaryCard
              title="Platform Kept"
              value={formatMoney(financialSummary.platformEarnings)}
              subtitle="Net revenue retained"
            />
            <SummaryCard
              title="Teacher Credits"
              value={formatMoney(financialSummary.teacherCoursePayouts)}
              subtitle="Course sale share"
            />
            <SummaryCard
              title="Withdrawals Paid"
              value={formatMoney(financialSummary.withdrawalsSent)}
              subtitle="Cash paid out to teachers"
            />
            <SummaryCard
              title="Total Distributed"
              value={formatMoney(totalDistributed)}
              subtitle="Credits + withdrawals"
            />
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Platform Earnings By Source</CardTitle>
              <CardDescription>
                Clean breakdown of what came in, what was shared with teachers, and what the platform kept.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Transactions</th>
                      <th className="px-4 py-3">Gross In</th>
                      <th className="px-4 py-3">Teacher Share</th>
                      <th className="px-4 py-3">Platform Kept</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {earningsBySource.map((row) => (
                      <tr key={row.source}>
                        <td className="px-4 py-3 font-medium text-foreground">{row.source}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.transactions}</td>
                        <td className="px-4 py-3">{formatMoney(row.grossAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(row.teacherShare)}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatMoney(row.platformKeeps)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Money In</CardTitle>
              <CardDescription>
                Every approved student payment, grouped clearly so course sales do not get mixed with subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">From</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">Platform</th>
                      <th className="px-4 py-3">Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {moneyInRows.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{row.payerName}</div>
                          <div className="text-xs text-muted-foreground">{row.payerEmail}</div>
                        </td>
                        <td className="px-4 py-3">{row.source}</td>
                        <td className="px-4 py-3">
                          <div className="text-foreground">{row.detail}</div>
                          {row.transactionId ? (
                            <div className="font-mono text-xs text-muted-foreground">
                              {row.transactionId}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{formatMoney(row.grossAmount)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {formatMoney(row.platformKeeps)}
                        </td>
                        <td className="px-4 py-3">{formatMoney(row.teacherShare)}</td>
                      </tr>
                    ))}
                    {moneyInRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No completed incoming payments yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Money Distributed</CardTitle>
              <CardDescription>
                Track exactly what has already gone out to teachers, whether it was course revenue share or a wallet withdrawal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">To</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {moneyOutRows.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{row.recipientName}</div>
                          <div className="text-xs text-muted-foreground">{row.recipientEmail}</div>
                        </td>
                        <td className="px-4 py-3">{row.typeLabel}</td>
                        <td className="px-4 py-3">
                          <div className="text-foreground">{row.detail}</div>
                          {row.transactionId ? (
                            <div className="font-mono text-xs text-muted-foreground">
                              {row.transactionId}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatMoney(row.amount)}
                        </td>
                      </tr>
                    ))}
                    {moneyOutRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No completed distributions yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Pending Review Queue</CardTitle>
              <CardDescription>
                Pending manual items stay out of revenue totals until an admin approves them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Waiting for review:{" "}
                <span className="font-semibold text-foreground">
                  {formatMoney(financialSummary.pendingReview)}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getApproveDialogTitle(approveTarget)}</DialogTitle>
            <DialogDescription>
              {getApproveDialogDescription(approveTarget)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              {approveTarget?.type === "COURSE_PURCHASE" ? (
                <p>Course: {approveTarget?.metadata?.courseName || "Unknown course"}</p>
              ) : (
                <p>Plan: {formatPlanLabel(approveTarget?.planSlug)}</p>
              )}
              <p>Amount: {formatMoney(approveTarget?.amount)}</p>
              <p>Txn ID: {approveTarget?.transactionId || "Not provided"}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Note (optional)</label>
              <Input
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Approved after screenshot review"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveTarget(null);
                setAdminNote("");
              }}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={acting}>
              {acting ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!refundTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRefundTarget(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund / Reject Manual Payment</DialogTitle>
            <DialogDescription>
              {getRefundDialogDescription(refundTarget)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p>User: {refundTarget?.userId?.name || "Unknown"}</p>
              {refundTarget?.type === "COURSE_PURCHASE" ? (
                <p>Course: {refundTarget?.metadata?.courseName || "Unknown course"}</p>
              ) : (
                <p>Plan: {formatPlanLabel(refundTarget?.planSlug)}</p>
              )}
              <p>Txn ID: {refundTarget?.transactionId || "Not provided"}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Duplicate claim or invalid screenshot"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRefundTarget(null);
                setAdminNote("");
              }}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={acting}>
              {acting ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function TransactionTypeLabel({ type }: { type: string }) {
  if (type === "CREDIT") {
    return (
      <span className="flex items-center text-emerald-600 dark:text-emerald-400">
        <ArrowUpRightIcon className="mr-1 size-4" />
        Credit
      </span>
    );
  }

  if (type === "COURSE_SALE_CREDIT") {
    return (
      <span className="flex items-center text-emerald-600 dark:text-emerald-400">
        <ArrowUpRightIcon className="mr-1 size-4" />
        Course Sale Credit
      </span>
    );
  }

  if (type === "SUBSCRIPTION_MANUAL") {
    return (
      <span className="flex items-center text-blue-600 dark:text-blue-400">
        <CreditCardIcon className="mr-1 size-4" />
        Manual Subscription
      </span>
    );
  }

  if (type === "COURSE_PURCHASE") {
    return (
      <span className="flex items-center text-blue-600 dark:text-blue-400">
        <CreditCardIcon className="mr-1 size-4" />
        Course Purchase
      </span>
    );
  }

  if (type === "WITHDRAWAL") {
    return (
      <span className="flex items-center text-orange-600 dark:text-orange-400">
        <ArrowDownRightIcon className="mr-1 size-4" />
        Withdrawal Payout
      </span>
    );
  }

  return (
    <span className="flex items-center text-red-600 dark:text-red-400">
      <ArrowDownRightIcon className="mr-1 size-4" />
      {type}
    </span>
  );
}

function LedgerDetails({ transaction }: { transaction: TransactionRecord }) {
  if (transaction.type === "SUBSCRIPTION_MANUAL") {
    return (
      <div className="space-y-1">
        <div>Plan: {formatPlanLabel(transaction.planSlug)}</div>
        {transaction.transactorName ? <div>By: {transaction.transactorName}</div> : null}
        {transaction.transactionId ? (
          <div className="font-mono">Txn: {transaction.transactionId}</div>
        ) : null}
        {transaction.screenshotUrl ? (
          <a
            href={transaction.screenshotUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ReceiptTextIcon className="size-3.5" />
            View screenshot
          </a>
        ) : null}
        {transaction.meta?.adminNote ? <div>Note: {transaction.meta.adminNote}</div> : null}
      </div>
    );
  }

  if (transaction.type === "COURSE_PURCHASE") {
    return (
      <div className="space-y-1">
        <div>Course: {transaction.metadata?.courseName || "Unknown course"}</div>
        {transaction.transactorName ? <div>By: {transaction.transactorName}</div> : null}
        {transaction.transactionId ? (
          <div className="font-mono">Txn: {transaction.transactionId}</div>
        ) : null}
        {transaction.meta?.paymentChannel ? (
          <div>Channel: {transaction.meta.paymentChannel}</div>
        ) : null}
        {typeof transaction.metadata?.commissionPercent === "number" ? (
          <div>
            Commission: {transaction.metadata.commissionPercent}% | Net:{" "}
            {formatMoney(transaction.metadata.netAmount)}
          </div>
        ) : null}
        {transaction.screenshotUrl ? (
          <a
            href={transaction.screenshotUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ReceiptTextIcon className="size-3.5" />
            View screenshot
          </a>
        ) : null}
        {transaction.meta?.adminNote ? <div>Note: {transaction.meta.adminNote}</div> : null}
      </div>
    );
  }

  if (transaction.type === "COURSE_SALE_CREDIT") {
    return (
      <div className="space-y-1">
        <div>Course: {transaction.metadata?.courseName || "Unknown course"}</div>
        {typeof transaction.metadata?.grossAmount === "number" ? (
          <div>Sale: {formatMoney(transaction.metadata.grossAmount)}</div>
        ) : null}
        {typeof transaction.metadata?.commissionPercent === "number" ? (
          <div>
            Platform share: {transaction.metadata.commissionPercent}% | Teacher share:{" "}
            {formatMoney(transaction.metadata?.netAmount ?? transaction.amount)}
          </div>
        ) : null}
        {transaction.meta?.adminNote ? <div>Note: {transaction.meta.adminNote}</div> : null}
      </div>
    );
  }

  if (transaction.type === "WITHDRAWAL") {
    return (
      <div className="space-y-1">
        <div>Cashout: {formatMoney(transaction.metadata?.nprEquivalent ?? transaction.amount)}</div>
        {typeof transaction.metadata?.pointsRequested === "number" ? (
          <div>Points: {transaction.metadata.pointsRequested}</div>
        ) : null}
        {transaction.metadata?.esewaNumber ? <div>eSewa: {transaction.metadata.esewaNumber}</div> : null}
        {transaction.transactionId ? (
          <div className="font-mono">Txn: {transaction.transactionId}</div>
        ) : null}
        {transaction.meta?.adminNote ? <div>Note: {transaction.meta.adminNote}</div> : null}
      </div>
    );
  }

  return (
    <>
      {transaction.gateway ? <div>{transaction.gateway}</div> : null}
      {transaction.transactionId ? (
        <div className="font-mono">{transaction.transactionId}</div>
      ) : null}
      {!transaction.gateway && !transaction.transactionId ? "—" : null}
    </>
  );
}

function StatusBadge({
  status,
  adminAction,
}: {
  status: string;
  adminAction?: string;
}) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2Icon className="mr-1 size-3.5" />
        Completed
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
        <XCircleIcon className="mr-1 size-3.5" />
        {adminAction === "REFUNDED" ? "Refunded" : "Failed"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
      <ClockIcon className="mr-1 size-3.5" />
      Pending
    </span>
  );
}
