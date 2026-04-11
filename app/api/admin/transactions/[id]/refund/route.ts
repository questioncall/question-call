import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitNotification } from "@/lib/pusher/pusherServer";
import Notification from "@/models/Notification";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import Transaction from "@/models/Transaction";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adminNote } = (await req.json().catch(() => ({}))) as {
      adminNote?: string | null;
    };

    await connectToDatabase();

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.type !== "SUBSCRIPTION_MANUAL") {
      return NextResponse.json(
        { error: "Only manual subscription transactions can be refunded" },
        { status: 400 },
      );
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending transactions can be refunded" },
        { status: 400 },
      );
    }

    const config = await getPlatformConfig();
    const plans = getHydratedPlans(config);
    const plan = plans.find((entry) => entry.slug === transaction.planSlug);
    const planName = plan?.name || "your subscription";

    transaction.status = "FAILED";
    transaction.gateway = "MANUAL";
    transaction.meta = {
      ...(transaction.meta || {}),
      adminAction: "REFUNDED",
      refundedAt: new Date().toISOString(),
      refundedBy: session.user.id,
      adminNote: adminNote?.trim() || null,
    };
    await transaction.save();

    const notification = await Notification.create({
      userId: transaction.userId,
      type: "PAYMENT",
      message: `Your manual payment for ${planName} was not approved${adminNote?.trim() ? `: ${adminNote.trim()}` : "."}`,
      isRead: false,
    }).catch(() => null);

    if (notification) {
      await emitNotification(transaction.userId.toString(), notification).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/transactions/[id]/refund]", error);
    return NextResponse.json(
      { error: "Failed to refund transaction" },
      { status: 500 },
    );
  }
}
