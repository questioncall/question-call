import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";
import { AdminHeaderClient } from "@/components/admin/admin-header-client";
import { AdminNav } from "./admin-nav";
import { connectToDatabase } from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Notification from "@/models/Notification";

async function getAdminCounts(adminUserId: string) {
  await connectToDatabase();

  const [pendingWithdrawals, expiredSubscriptions, pendingManualSubscriptions, unreadNotifications] =
    await Promise.all([
      WithdrawalRequest.countDocuments({ status: "PENDING" }),
      User.countDocuments({ role: "STUDENT", subscriptionStatus: "EXPIRED" }),
      Transaction.countDocuments({ type: "SUBSCRIPTION_MANUAL", status: "PENDING" }),
      Notification.countDocuments({ userId: adminUserId, isRead: false }),
    ]);

  return {
    pendingWithdrawals,
    expiredSubscriptions,
    pendingManualSubscriptions,
    unreadNotifications,
  };
}

const adminNavItems = [
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/payment-config", label: "Payment config" },
  { href: "/admin/format-config", label: "Format config" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/quiz-management", label: "Quiz management" },
  { href: "/admin/ai-keys", label: "AI Keys" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/courses/coupons", label: "Coupons" },
  { href: "/admin/live-sessions", label: "Live sessions" },
  { href: "/admin/legal", label: "Legal" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default async function AdminPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSafeServerSession();

  if (!session?.user?.role) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect(getProfilePath(session.user));
  }

  const counts = await getAdminCounts(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo href="/admin/pricing" prefetch={false} />
              <p className="mt-3 text-sm text-muted-foreground">Admin portal</p>
            </div>
            <div className="flex items-center gap-4">
              <AdminHeaderClient initialCounts={counts} />
              <SignOutButton />
            </div>
          </div>

          <AdminNav items={[...adminNavItems]} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}


