import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";

const adminNavItems = [
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/format-config", label: "Format config" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/transactions", label: "Transactions" },
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo />
              <p className="mt-3 text-sm text-muted-foreground">Admin portal</p>
            </div>
            <SignOutButton />
          </div>

          <nav className="mt-4 flex flex-wrap gap-2">
            {adminNavItems.map((item) => (
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
