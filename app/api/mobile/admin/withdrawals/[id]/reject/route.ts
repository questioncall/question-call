import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { rejectWithdrawal } from "@/lib/admin/withdrawal-actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/admin/withdrawals/[id]/reject
 * Body: { adminNote? }
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

    const result = await rejectWithdrawal({ id, adminId: gate.userId, adminNote });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/mobile/admin/withdrawals/[id]/reject error:", error);
    return NextResponse.json({ error: "Failed to reject withdrawal" }, { status: 500 });
  }
}
