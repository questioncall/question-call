import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { completeWithdrawal } from "@/lib/admin/withdrawal-actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/admin/withdrawals/[id]/complete
 * Body: { transactionId, amountSent, adminNote? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const { transactionId, amountSent, adminNote } = (await request
      .json()
      .catch(() => ({}))) as {
      transactionId?: string;
      amountSent?: number;
      adminNote?: string | null;
    };

    const result = await completeWithdrawal({
      id,
      adminId: gate.userId,
      transactionId: transactionId ?? "",
      amountSent: Number(amountSent),
      adminNote,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/mobile/admin/withdrawals/[id]/complete error:", error);
    return NextResponse.json({ error: "Failed to complete withdrawal" }, { status: 500 });
  }
}
