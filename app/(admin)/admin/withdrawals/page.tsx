"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  Loader2Icon,
  AlertCircleIcon,
  FilterIcon,
  BanknoteIcon,
} from "lucide-react";

import { getPusherClient } from "@/lib/pusher/pusherClient";
import { ADMIN_UPDATES_CHANNEL, ADMIN_WITHDRAWAL_EVENT } from "@/lib/pusher/events";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Requester = {
  _id: string;
  name: string;
  email: string;
  role?: "STUDENT" | "TEACHER" | "ADMIN";
  username?: string;
  userImage?: string;
};

type WithdrawalRequest = {
  _id: string;
  teacherId: Requester;
  pointsRequested: number;
  nprEquivalent: number;
  esewaNumber: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  transactionId: string | null;
  amountSent: number | null;
  processedAt: string | null;
  processedBy: string | null;
  adminNote: string | null;
  createdAt: string;
};

type FilterStatus = "ALL" | "PENDING" | "COMPLETED" | "REJECTED";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("ALL");

  // Complete modal state
  const [completeTarget, setCompleteTarget] = useState<WithdrawalRequest | null>(null);
  const [txnId, setTxnId] = useState("");
  const [amountSent, setAmountSent] = useState("");
  const [completeNote, setCompleteNote] = useState("");
  const [completing, setCompleting] = useState(false);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<WithdrawalRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== "ALL" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/withdrawals${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data.requests);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(ADMIN_UPDATES_CHANNEL);
    channel.bind(ADMIN_WITHDRAWAL_EVENT, (data: { request: WithdrawalRequest }) => {
      setRequests((prev) => [data.request, ...prev.filter(r => r._id !== data.request._id)]);
      toast.info(`New withdrawal request from ${data.request.teacherId?.name || "User"}`);
    });

    return () => {
      pusher.unsubscribe(ADMIN_UPDATES_CHANNEL);
    };
  }, []);

  const handleComplete = async () => {
    if (!completeTarget || !txnId.trim() || !amountSent) return;

    setCompleting(true);
    try {
      const res = await fetch(
        `/api/admin/withdrawals/${completeTarget._id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: txnId.trim(),
            amountSent: parseFloat(amountSent),
            adminNote: completeNote.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete");
      }
      setCompleteTarget(null);
      setTxnId("");
      setAmountSent("");
      setCompleteNote("");
      await fetchRequests();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCompleting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    setRejecting(true);
    try {
      const res = await fetch(
        `/api/admin/withdrawals/${rejectTarget._id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminNote: rejectNote.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject");
      }
      setRejectTarget(null);
      setRejectNote("");
      await fetchRequests();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRejecting(false);
    }
  };

  const openCompleteModal = (req: WithdrawalRequest) => {
    setCompleteTarget(req);
    setAmountSent(req.nprEquivalent.toString());
    setTxnId("");
    setCompleteNote("");
  };

  const statusCounts = {
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    COMPLETED: requests.filter((r) => r.status === "COMPLETED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          <BanknoteIcon className="mr-2 inline-block size-6 text-primary" />
          Withdrawal Requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage student and teacher withdrawal requests. Send money via eSewa and mark as complete.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {statusCounts.PENDING}
          </p>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pending
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {statusCounts.COMPLETED}
          </p>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Completed
          </p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {statusCounts.REJECTED}
          </p>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Rejected
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterIcon className="size-4 text-muted-foreground" />
        {(["ALL", "PENDING", "COMPLETED", "REJECTED"] as FilterStatus[]).map(
          (f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </Button>
          )
        )}
      </div>

      {/* Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Requests</CardTitle>
          <CardDescription>{requests.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <AlertCircleIcon className="size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRequests}>
                Retry
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No withdrawal requests found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3">Requester</th>
                    <th className="px-3 py-3">Points</th>
                    <th className="px-3 py-3">NPR</th>
                    <th className="px-3 py-3">eSewa</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req._id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {req.teacherId?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {req.teacherId?.email}
                          </p>
                          {req.teacherId?.role && (
                            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {req.teacherId.role}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">
                        {req.pointsRequested}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {req.nprEquivalent}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                        {req.esewaNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-3 py-3">
                        {req.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 gap-1 text-xs"
                              onClick={() => openCompleteModal(req)}
                            >
                              <CheckCircle2Icon className="size-3" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 gap-1 text-xs"
                              onClick={() => setRejectTarget(req)}
                            >
                              <XCircleIcon className="size-3" />
                              Reject
                            </Button>
                          </div>
                        ) : req.status === "COMPLETED" ? (
                          <div className="text-xs text-muted-foreground">
                            <p>Txn: {req.transactionId}</p>
                            <p>Sent: NPR {req.amountSent}</p>
                            {req.processedAt && (
                              <p>
                                {new Date(req.processedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {req.adminNote || "Rejected"}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Modal */}
      <Dialog
        open={!!completeTarget}
        onOpenChange={(open) => !open && setCompleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Withdrawal as Complete</DialogTitle>
            <DialogDescription>
              Confirm you have sent NPR {completeTarget?.nprEquivalent} to eSewa
              number {completeTarget?.esewaNumber} for{" "}
              {completeTarget?.teacherId?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                eSewa Transaction ID *
              </label>
              <Input
                placeholder="e.g. ESW-12345678"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Sent (NPR) *</label>
              <Input
                type="number"
                value={amountSent}
                onChange={(e) => setAmountSent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                placeholder="e.g. Sent via eSewa personal account"
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteTarget(null)}
              disabled={completing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completing || !txnId.trim() || !amountSent}
              className="gap-2"
            >
              {completing && <Loader2Icon className="size-4 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>
              This will NOT deduct any points from the requester. They can submit a
              new request afterward.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason / Note (optional)
              </label>
              <Input
                placeholder="e.g. Invalid eSewa number"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting}
              className="gap-2"
            >
              {rejecting && <Loader2Icon className="size-4 animate-spin" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
