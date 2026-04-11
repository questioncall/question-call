import { NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import mongoose from "mongoose";

export async function GET() {
  try {
    const session = await getSafeServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const pendingTx = await Transaction.findOne({
      userId: session.user.id,
      type: "SUBSCRIPTION_MANUAL",
      status: "PENDING",
    }).sort({ createdAt: -1 });

    const subscription = await getQuizSubscriptionSnapshot(session.user.id);

    // 4. Count questions asked
    const Question = mongoose.models.Question;
    let questionsAsked = 0;
    if (Question) {
      questionsAsked = await Question.countDocuments({ askerId: session.user.id });
    }

    return NextResponse.json({
      subscriptionStatus: subscription.subscriptionStatus,
      subscriptionEnd: subscription.subscriptionEnd,
      pendingManualPayment: !!pendingTx,
      questionsAsked,
      planSlug: subscription.planSlug,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Subscription metrics fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
