import { redirect } from "next/navigation";

import { PortalShell } from "@/components/shared/portal-shell";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";

const adminNavItems = [
  {
    href: "/admin/pricing",
    label: "Pricing",
    description: "Tier price and commission controls will live here.",
  },
  {
    href: "/admin/tier-config",
    label: "Tier config",
    description: "Manage answer deadlines and qualification thresholds.",
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Future user management and moderation tools.",
  },
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
    redirect(getProfilePath(session.user.role));
  }

  return (
    <PortalShell
      headline="Admin routes are scaffolded for later phases."
      navItems={adminNavItems.map((item) => ({ ...item }))}
      portalName="Admin Portal"
      summary="Pricing, tier timing, and user administration pages now have a dedicated protected area ready for future platform controls."
      tone="admin"
      userEmail={session.user.email}
      userName={session.user.name}
    >
      {children}
    </PortalShell>
  );
}


