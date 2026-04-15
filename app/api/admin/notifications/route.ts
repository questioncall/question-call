import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import WithdrawalRequest from "@/models/WithdrawalRequest";

type AdminNotificationItem = {
  id: string;
  category: "WITHDRAWAL" | "PAYMENT" | "EXPIRY";
  title: string;
  message: string;
  createdAt: string;
  href: string;
};

type PendingWithdrawalRecord = {
  _id: { toString(): string };
  status?: string;
  teacherId?: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  pointsRequested: number;
  nprEquivalent: number;
  esewaNumber: string;
  createdAt: Date | string;
};

type PendingManualPaymentRecord = {
  _id: { toString(): string };
  status?: string;
  userId?: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  planSlug?: string;
  transactionId?: string;
  createdAt: Date | string;
};

type ExpiredStudentRecord = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  subscriptionEnd?: Date | string | null;
  updatedAt: Date | string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const searchParams = new URL(request.url).searchParams;
    const history = searchParams.get("history") === "true";

    const config = await getPlatformConfig();
    const plans = getHydratedPlans(config);
    const planLabelBySlug = new Map(plans.map((plan) => [plan.slug, plan.name]));

    const [withdrawals, transactions, expiredStudents] = await Promise.all([
      history
        ? WithdrawalRequest.find().populate("teacherId", "name email role").sort({ createdAt: -1 }).lean()
        : WithdrawalRequest.find({ status: "PENDING" })
            .populate("teacherId", "name email role")
            .sort({ createdAt: -1 })
            .limit(25)
            .lean(),
      history
        ? Transaction.find({ type: "SUBSCRIPTION_MANUAL" })
            .populate({ path: "userId", select: "name email role", model: User })
            .sort({ createdAt: -1 })
            .lean()
        : Transaction.find({
            type: "SUBSCRIPTION_MANUAL",
            status: "PENDING",
          })
            .populate({ path: "userId", select: "name email role", model: User })
            .sort({ createdAt: -1 })
            .limit(25)
            .lean(),
      history
        ? User.find({ role: "STUDENT", subscriptionStatus: "EXPIRED" })
            .select("name email subscriptionEnd updatedAt")
            .sort({ updatedAt: -1 })
            .lean()
        : User.find({
            role: "STUDENT",
            subscriptionStatus: "EXPIRED",
          })
            .select("name email subscriptionEnd updatedAt")
            .sort({ updatedAt: -1 })
            .limit(25)
            .lean(),
    ]);

    const notifications: AdminNotificationItem[] = [
      ...(withdrawals as unknown as Array<{ _id: { toString(): string }; status?: string; teacherId?: { name?: string; email?: string; role?: string } | null; pointsRequested: number; nprEquivalent: number; esewaNumber: string; createdAt: Date | string }>).map((request) => ({
        id: `withdrawal-${request._id.toString()}`,
        category: "WITHDRAWAL" as const,
        title: request.status === "PENDING" ? "Withdrawal request pending" : `Withdrawal ${request.status?.toLowerCase() || "processed"}`,
        message: `${request.teacherId?.name || "A user"} requested ${request.pointsRequested} pts (NPR ${request.nprEquivalent}) to eSewa ${request.esewaNumber}.`,
        createdAt: new Date(request.createdAt).toISOString(),
        href: "/admin/withdrawals",
      })),
      ...(transactions as unknown as Array<{ _id: { toString(): string }; status?: string; userId?: { name?: string; email?: string; role?: string } | null; planSlug?: string; transactionId?: string; createdAt: Date | string }>).map((transaction) => ({
        id: `manual-payment-${transaction._id.toString()}`,
        category: "PAYMENT" as const,
        title: transaction.status === "PENDING" ? "Manual payment awaiting review" : `Payment ${transaction.status?.toLowerCase() || "processed"}`,
        message: `${transaction.userId?.name || "A student"} submitted ${planLabelBySlug.get(transaction.planSlug || "") || "a subscription"} payment${transaction.transactionId ? ` with transaction ID ${transaction.transactionId}` : ""}.`,
        createdAt: new Date(transaction.createdAt).toISOString(),
        href: "/admin/transactions",
      })),
      ...(expiredStudents as ExpiredStudentRecord[]).map((student) => ({
        id: `expired-student-${student._id.toString()}`,
        category: "EXPIRY" as const,
        title: "Student subscription expired",
        message: `${student.name || "A student"}${student.email ? ` (${student.email})` : ""} currently needs renewal access.`,
        createdAt: new Date(student.subscriptionEnd || student.updatedAt).toISOString(),
        href: "/admin/users",
      })),
    ].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}