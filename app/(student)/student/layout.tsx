import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";
import { getSignInPath } from "@/lib/user-paths";

const studentNavItems = [
  { href: "/", label: "Home" },
  { href: "/settings", label: "Settings" },
  { href: "/subscription", label: "Subscription" },
] as const;

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSafeServerSession();

  if (!session?.user?.role) {
    redirect(getSignInPath());
  }

  if (session.user.role !== "STUDENT") {
    redirect(getProfilePath(session.user));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo />
              <p className="mt-3 text-sm text-muted-foreground">Legacy student routes</p>
            </div>
            <SignOutButton />
          </div>

          <nav className="mt-4 flex flex-wrap gap-2">
            {studentNavItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
