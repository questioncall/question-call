import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { deletionGraceExpiresAt } from "@/lib/account-deletion";
import { Badge } from "@/components/ui/badge";
import { createNoIndexMetadata } from "@/lib/seo";
import AccountDeletion from "@/models/AccountDeletion";

export const dynamic = "force-dynamic";

export const metadata = createNoIndexMetadata({
  title: "Account Deletions",
  description: "Audit log of self-service account deletions.",
});

type DeletionRow = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  role?: string;
  reason?: string;
  deletedAt?: Date;
  status?: "pending" | "recovered" | "purged";
  recoveredAt?: Date | null;
  purgedAt?: Date | null;
};

function formatDateTime(value?: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "recovered") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        Recovered
      </Badge>
    );
  }
  if (status === "purged") {
    return <Badge variant="destructive">Purged</Badge>;
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
      Pending
    </Badge>
  );
}

export default async function AdminAccountDeletionsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const rows = (await AccountDeletion.find({})
    .sort({ deletedAt: -1 })
    .limit(500)
    .lean()) as unknown as DeletionRow[];

  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    recovered: rows.filter((r) => r.status === "recovered").length,
    purged: rows.filter((r) => r.status === "purged").length,
  };

  const stats = [
    { label: "Total deletions", value: counts.total },
    { label: "Pending (recoverable)", value: counts.pending },
    { label: "Recovered", value: counts.recovered },
    { label: "Permanently purged", value: counts.purged },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Account Deletions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who deleted their account, when, and why. Deleted accounts stay
          recoverable for 30 days before being permanently anonymized.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-background p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No account deletions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Deleted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row._id.toString()}
                    className="border-b border-border last:border-0 align-top"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {row.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.email || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.role || "—"}
                    </td>
                    <td className="px-4 py-3 max-w-sm text-foreground">
                      {row.reason ? (
                        <span className="whitespace-pre-wrap">{row.reason}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          No reason given
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(row.deletedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                      {row.status === "pending" && row.deletedAt ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Recoverable until{" "}
                          {formatDateTime(
                            deletionGraceExpiresAt(new Date(row.deletedAt)),
                          )}
                        </div>
                      ) : null}
                      {row.status === "recovered" && row.recoveredAt ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {formatDateTime(row.recoveredAt)}
                        </div>
                      ) : null}
                      {row.status === "purged" && row.purgedAt ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {formatDateTime(row.purgedAt)}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
