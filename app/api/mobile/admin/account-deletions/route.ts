import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { deletionGraceExpiresAt } from "@/lib/account-deletion";
import AccountDeletion from "@/models/AccountDeletion";

export const dynamic = "force-dynamic";

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

/**
 * GET /api/mobile/admin/account-deletions
 *
 * Mobile mirror of the web Account Deletions audit page — newest first, with a
 * computed `graceExpiresAt` for pending rows and summary counts.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const rows = (await AccountDeletion.find({})
      .sort({ deletedAt: -1 })
      .limit(500)
      .lean()) as unknown as DeletionRow[];

    const requests = rows.map((r) => ({
      _id: r._id.toString(),
      name: r.name ?? null,
      email: r.email ?? null,
      role: r.role ?? null,
      reason: r.reason ?? null,
      deletedAt: r.deletedAt ?? null,
      status: r.status ?? "pending",
      recoveredAt: r.recoveredAt ?? null,
      purgedAt: r.purgedAt ?? null,
      graceExpiresAt:
        r.status === "pending" && r.deletedAt
          ? deletionGraceExpiresAt(new Date(r.deletedAt))
          : null,
    }));

    const counts = {
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      recovered: requests.filter((r) => r.status === "recovered").length,
      purged: requests.filter((r) => r.status === "purged").length,
    };

    return NextResponse.json({ requests, counts });
  } catch (error) {
    console.error("GET /api/mobile/admin/account-deletions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
