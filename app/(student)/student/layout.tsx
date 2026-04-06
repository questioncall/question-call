import { redirect } from "next/navigation";

import { PortalShell } from "@/components/shared/portal-shell";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";

const studentNavItems = [
  {
    href: "/student/profile",
    label: "Profile",
    description: "Your student account, progress, and future points view.",
  },
  {
    href: "/student/ask",
    label: "Ask",
    description: "Create a new question with tier and visibility.",
  },
  {
    href: "/student/feed",
    label: "Feed",
    description: "Browse open and solved academic questions.",
  },
  {
    href: "/student/inbox",
    label: "Inbox",
    description: "Private answers and future channel follow-ups.",
  },
  {
    href: "/student/leaderboard",
    label: "Leaderboard",
    description: "Track participation and peer-answer standing.",
  },
] as const;

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSafeServerSession();

  if (!session?.user?.role) {
    redirect("/");
  }

  if (session.user.role !== "STUDENT") {
    redirect(getProfilePath(session.user.role));
  }

  return (
    <PortalShell
      headline="Your student profile area is ready."
      navItems={studentNavItems.map((item) => ({ ...item }))}
      portalName="Student Profile"
      summary="This protected area now holds profile-focused pages, while the authenticated root route is free to become the main question-feed home."
      tone="student"
      userEmail={session.user.email}
      userName={session.user.name}
    >
      {children}
    </PortalShell>
  );
}


