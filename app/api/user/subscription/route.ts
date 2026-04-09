import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const session = await getSafeServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // 1. Check for any PENDING manual transaction first
    const pendingTx = await Transaction.findOne({
      userId: session.user.id,
      type: "SUBSCRIPTION_MANUAL",
      status: "PENDING",
    }).sort({ createdAt: -1 });

    // 2. Find the latest COMPLETED subscription transaction
    const activeTx = await Transaction.findOne({
      userId: session.user.id,
      type: "SUBSCRIPTION_MANUAL",
      status: "COMPLETED",
    }).sort({ createdAt: -1 });

    // 3. Derive subscription status from the transaction data
    let subscriptionStatus: "ACTIVE" | "EXPIRED" | "NONE" = "NONE";
    let subscriptionEnd: string | null = null;
    let planSlug: string | null = null;

    if (activeTx && activeTx.planSlug) {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.slug === activeTx.planSlug);
      if (plan) {
        // Compute end date from when the admin approved it (updatedAt) + plan duration
        const startDate = new Date(activeTx.updatedAt);
        const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        subscriptionEnd = endDate.toISOString();
        planSlug = plan.slug;

        if (endDate > new Date()) {
          subscriptionStatus = "ACTIVE";
        } else {
          subscriptionStatus = "EXPIRED";
        }
      }
    }

    // 4. Count questions asked
    const Question = mongoose.models.Question;
    let questionsAsked = 0;
    if (Question) {
      questionsAsked = await Question.countDocuments({ askerId: session.user.id });
    }

    return NextResponse.json({
      subscriptionStatus,
      subscriptionEnd,
      pendingManualPayment: !!pendingTx,
      questionsAsked,
      planSlug,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Subscription metrics fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
