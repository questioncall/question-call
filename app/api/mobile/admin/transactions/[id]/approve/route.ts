import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { approveTransaction } from "@/lib/admin/transaction-actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/admin/transactions/[id]/approve
 * Mobile mirror of the web approve route via the shared service.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const { adminNote } = (await request.json().catch(() => ({}))) as {
      adminNote?: string | null;
    };

    const result = await approveTransaction({
      transactionId: id,
      adminId: gate.userId,
      adminNote,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("POST /api/mobile/admin/transactions/[id]/approve error:", error);
    return NextResponse.json({ error: "Failed to approve transaction" }, { status: 500 });
  }
}
