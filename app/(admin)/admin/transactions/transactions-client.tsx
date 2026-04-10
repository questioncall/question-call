"use client";

import { useEffect, useState } from "react";
import { ActivityIcon, Loader2Icon, FilterIcon, AlertCircleIcon, ArrowUpRightIcon, ArrowDownRightIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  createdAt: string;
};

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    async function fetchTxns() {
      try {
        const res = await fetch("/api/admin/transactions");
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        setTransactions(data);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTxns();
  }, []);

  const filteredTxns = transactions.filter(t => filter === "ALL" ? true : t.type === filter);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <ActivityIcon className="mr-2 inline-block size-6 text-primary" />
          Platform Transactions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor all incoming user payments, subscription logs, and credits.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterIcon className="size-4 text-muted-foreground" />
        {(["ALL", "SUBSCRIPTION_MANUAL", "CREDIT", "DEBIT", "WITHDRAWAL"]).map(
          (f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? "All" : f.replace("_", " ")}
            </Button>
          )
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Total {filteredTxns.length} records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Gateway / Txn ID</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTxns.map((t) => (
                  <tr key={t._id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{t.userId?.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{t.userId?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {t.type === "CREDIT" ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                          <ArrowUpRightIcon className="mr-1 size-4" /> Credit
                        </span>
                      ) : t.type.includes("SUBSCRIPTION") ? (
                        <span className="flex items-center text-blue-600 dark:text-blue-400">
                          <ArrowUpRightIcon className="mr-1 size-4" /> Susbcription
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400">
                          <ArrowDownRightIcon className="mr-1 size-4" /> {t.type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {t.amount}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.gateway && <div>{t.gateway}</div>}
                      {t.transactionId && <div className="font-mono">{t.transactionId}</div>}
                      {!t.gateway && !t.transactionId && "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                        t.status === "FAILED" ? "bg-red-500/10 text-red-700 dark:text-red-400" :
                        "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTxns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
