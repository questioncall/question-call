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
  };
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
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

      toast.success("Transaction approved and subscription activated.");
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

      toast.success("Transaction marked as refunded.");
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
    <div className="mx-auto w-fit max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <ActivityIcon className="mr-2 inline-block size-6 text-primary" />
          Platform Transactions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor payments, subscription review items, credits, and withdrawal-related records.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterIcon className="size-4 text-muted-foreground" />
        {(["ALL", "SUBSCRIPTION_MANUAL", "CREDIT", "DEBIT", "WITHDRAWAL"]).map(
          (item) => (
            <Button
              key={item}
              variant={filter === item ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item)}
            >
              {item === "ALL" ? "All" : item.replace("_", " ")}
            </Button>
          ),
        )}
      </div>

      <Card className="mx-auto w-fit max-w-full">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Total {filteredTxns.length} records</CardDescription>
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
                        {transaction.userId?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {transaction.userId?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {transaction.type === "CREDIT" ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                          <ArrowUpRightIcon className="mr-1 size-4" />
                          Credit
                        </span>
                      ) : transaction.type === "SUBSCRIPTION_MANUAL" ? (
                        <span className="flex items-center text-blue-600 dark:text-blue-400">
                          <CreditCardIcon className="mr-1 size-4" />
                          Manual Subscription
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400">
                          <ArrowDownRightIcon className="mr-1 size-4" />
                          {transaction.type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      NPR {transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {transaction.type === "SUBSCRIPTION_MANUAL" ? (
                        <div className="space-y-1">
                          <div>Plan: {formatPlanLabel(transaction.planSlug)}</div>
                          {transaction.transactorName ? (
                            <div>By: {transaction.transactorName}</div>
                          ) : null}
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
                          {transaction.meta?.adminNote ? (
                            <div>Note: {transaction.meta.adminNote}</div>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          {transaction.gateway && <div>{transaction.gateway}</div>}
                          {transaction.transactionId && (
                            <div className="font-mono">{transaction.transactionId}</div>
                          )}
                          {!transaction.gateway && !transaction.transactionId && "—"}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={transaction.status}
                        adminAction={transaction.meta?.adminAction}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {transaction.type === "SUBSCRIPTION_MANUAL" &&
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
            <DialogTitle>Approve Manual Subscription</DialogTitle>
            <DialogDescription>
              This will activate {approveTarget?.userId?.name}&apos;s subscription immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p>Plan: {formatPlanLabel(approveTarget?.planSlug)}</p>
              <p>Amount: NPR {approveTarget?.amount.toFixed(2) || "0.00"}</p>
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
              This keeps the transaction in the history but does not activate the student&apos;s plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p>User: {refundTarget?.userId?.name || "Unknown"}</p>
              <p>Plan: {formatPlanLabel(refundTarget?.planSlug)}</p>
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

function formatPlanLabel(planSlug?: string) {
  if (planSlug === "1month") {
    return "1 Month Plan";
  }

  if (planSlug === "3month") {
    return "3 Month Plan";
  }

  if (planSlug === "free") {
    return "Free Trial";
  }

  return planSlug || "—";
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
