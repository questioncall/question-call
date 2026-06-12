import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

type LeanTransactionForFinance = {
  type: string;
  amount?: number | null;
  status: string;
  metadata?: {
    grossAmount?: number | null;
    netAmount?: number | null;
  } | null;
};

function asMoney(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildFinanceSummary(transactions: LeanTransactionForFinance[]) {
  const completedIncomingTransactions = transactions.filter(
    (transaction) =>
      transaction.status === "COMPLETED" &&
      (transaction.type === "SUBSCRIPTION_MANUAL" ||
        transaction.type === "COURSE_PURCHASE"),
  );
  const distributedTransactions = transactions.filter(
    (transaction) =>
      transaction.status === "COMPLETED" &&
      (transaction.type === "COURSE_SALE_CREDIT" || transaction.type === "WITHDRAWAL"),
  );

  const paidSubscriptions = completedIncomingTransactions.filter(
    (transaction) =>
      transaction.type === "SUBSCRIPTION_MANUAL" && asMoney(transaction.amount) > 0,
  );
  const paidCoursePurchases = completedIncomingTransactions.filter((transaction) => {
    const grossAmount = asMoney(transaction.metadata?.grossAmount ?? transaction.amount);
    return transaction.type === "COURSE_PURCHASE" && grossAmount > 0;
  });

  const completedRevenue =
    paidSubscriptions.reduce((sum, transaction) => sum + asMoney(transaction.amount), 0) +
    paidCoursePurchases.reduce(
      (sum, transaction) => sum + asMoney(transaction.metadata?.grossAmount ?? transaction.amount),
      0,
    );

  const platformEarnings =
    paidSubscriptions.reduce((sum, transaction) => sum + asMoney(transaction.amount), 0) +
    paidCoursePurchases.reduce((sum, transaction) => {
      const grossAmount = asMoney(transaction.metadata?.grossAmount ?? transaction.amount);
      const teacherShare = asMoney(transaction.metadata?.netAmount);
      return sum + Math.max(grossAmount - teacherShare, 0);
    }, 0);

  const teacherCoursePayouts = distributedTransactions
    .filter((transaction) => transaction.type === "COURSE_SALE_CREDIT")
    .reduce((sum, transaction) => sum + asMoney(transaction.amount), 0);

  const withdrawalsSent = distributedTransactions
    .filter((transaction) => transaction.type === "WITHDRAWAL")
    .reduce((sum, transaction) => sum + asMoney(transaction.amount), 0);

  const pendingReview = transactions
    .filter(
      (transaction) =>
        transaction.status === "PENDING" &&
        (transaction.type === "SUBSCRIPTION_MANUAL" ||
          transaction.type === "COURSE_PURCHASE"),
    )
    .reduce((sum, transaction) => sum + asMoney(transaction.amount), 0);

  return {
    financialSummary: {
      completedRevenue,
      platformEarnings,
      teacherCoursePayouts,
      withdrawalsSent,
      pendingReview,
    },
    earningsBySource: [
      {
        source: "Subscriptions",
        transactions: paidSubscriptions.length,
        grossAmount: paidSubscriptions.reduce(
          (sum, transaction) => sum + asMoney(transaction.amount),
          0,
        ),
        platformKeeps: paidSubscriptions.reduce(
          (sum, transaction) => sum + asMoney(transaction.amount),
          0,
        ),
        teacherShare: 0,
      },
      {
        source: "Course commissions",
        transactions: paidCoursePurchases.length,
        grossAmount: paidCoursePurchases.reduce(
          (sum, transaction) =>
            sum + asMoney(transaction.metadata?.grossAmount ?? transaction.amount),
          0,
        ),
        platformKeeps: paidCoursePurchases.reduce((sum, transaction) => {
          const grossAmount = asMoney(transaction.metadata?.grossAmount ?? transaction.amount);
          const teacherShare = asMoney(transaction.metadata?.netAmount);
          return sum + Math.max(grossAmount - teacherShare, 0);
        }, 0),
        teacherShare: paidCoursePurchases.reduce(
          (sum, transaction) => sum + asMoney(transaction.metadata?.netAmount),
          0,
        ),
      },
    ],
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

    const [transactions, total, financeTransactions] = await Promise.all([
      Transaction.find()
        .populate({ path: "userId", select: "name email role", model: User })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(),
      Transaction.find({
        type: {
          $in: [
            "SUBSCRIPTION_MANUAL",
            "COURSE_PURCHASE",
            "COURSE_SALE_CREDIT",
            "WITHDRAWAL",
          ],
        },
      })
        .select("type amount status metadata")
        .lean<LeanTransactionForFinance[]>(),
    ]);

    return NextResponse.json({
      transactions,
      total,
      ...buildFinanceSummary(financeTransactions),
    });
  } catch (error) {
    console.error("GET Admin Transactions Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
