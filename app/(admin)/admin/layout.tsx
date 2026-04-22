import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";
import { AdminHeaderClient } from "@/components/admin/admin-header-client";
import { AdminSearchClient } from "@/components/admin/admin-search-client";
import { AdminNav } from "./admin-nav";
import { connectToDatabase } from "@/lib/mongodb";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-portal";
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 xl:w-[17rem]">
              <Logo href="/admin/settings" prefetch={false} showTagline={false} />
              <p className="mt-1 text-sm text-muted-foreground">Admin portal</p>
            </div>
            <div className="flex flex-1 justify-center">
              <AdminSearchClient />
            </div>
            <div className="flex items-center justify-end gap-4 xl:w-[23rem]">
              <AdminHeaderClient initialCounts={counts} />
              <SignOutButton />
            </div>
          </div>

          <AdminNav items={[...ADMIN_NAV_ITEMS]} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}


