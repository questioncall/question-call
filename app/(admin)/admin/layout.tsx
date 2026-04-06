import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { getSafeServerSession, getProfilePath } from "@/lib/auth";

const adminNavItems = [
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/tier-config", label: "Tier config" },
  { href: "/admin/users", label: "Users" },
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
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo />
              <p className="mt-3 text-sm text-slate-500">Admin portal</p>
            </div>
            <SignOutButton />
          </div>

          <nav className="mt-4 flex flex-wrap gap-2">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
