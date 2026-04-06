import { redirect } from "next/navigation";

import { PortalShell } from "@/components/shared/portal-shell";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";

const teacherNavItems = [
  {
    href: "/teacher/profile",
    label: "Profile",
    description: "Your teacher account, ratings, and future monetization view.",
  },
  {
    href: "/teacher/questions",
    label: "Questions",
    description: "Browse and accept open student questions.",
  },
  {
    href: "/teacher/wallet",
    label: "Wallet",
    description: "Future earnings, credits, and withdrawals.",
  },
] as const;

export default async function TeacherPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSafeServerSession();

  if (!session?.user?.role) {
    redirect("/");
  }

  if (session.user.role !== "TEACHER") {
    redirect(getProfilePath(session.user.role));
  }

  return (
    <PortalShell
      headline="Your teacher profile area is ready."
      navItems={teacherNavItems.map((item) => ({ ...item }))}
      portalName="Teacher Profile"
      summary="This protected area now focuses on profile-style teacher pages, while the authenticated root route stays available for the shared home feed and header UI."
      tone="teacher"
      userEmail={session.user.email}
      userName={session.user.name}
    >
      {children}
    </PortalShell>
  );
}


