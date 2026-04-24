import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/shared/sign-out-button";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";
import { AdminHeaderClient } from "@/components/admin/admin-header-client";
import { AdminSearchClient } from "@/components/admin/admin-search-client";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { OnboardingVideoModal } from "@/components/shared/onboarding-video-modal";
import { getAdminNotificationCounts } from "@/lib/admin-notifications";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Admin",
  description: "Private administrative routes for Question Call staff.",
});

async function getAdminCounts(adminUserId: string) {
  return getAdminNotificationCounts(adminUserId);
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
    <div className="flex h-screen overflow-hidden bg-background">
      <OnboardingVideoModal />
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-20 shrink-0 items-center justify-between border-b gap-8 border-border bg-background px-8">
          <div className="flex flex-1 max-w-xl items-center">
            <div className="w-full">
              <AdminSearchClient />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AdminHeaderClient initialCounts={counts} />
            <div className="h-6 w-px bg-border" />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30 p-8">
          <div className="mx-auto max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
