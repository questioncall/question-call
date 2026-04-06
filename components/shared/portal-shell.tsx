"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

type PortalShellProps = {
  tone: "student" | "teacher" | "admin";
  portalName: string;
  headline: string;
  summary: string;
  userName?: string | null;
  userEmail?: string | null;
  navItems: NavItem[];
  children: ReactNode;
};

const toneStyles = {
  student: {
    badge: "bg-[#e5f6eb] text-[#0d6a46]",
    banner: "bg-[linear-gradient(135deg,_rgba(255,244,221,0.95),_rgba(231,246,237,0.92))]",
    active: "bg-[#1e1914] text-white shadow-[0_16px_40px_rgba(30,25,20,0.12)]",
  },
  teacher: {
    badge: "bg-[#e7f2ff] text-[#1e5a87]",
    banner: "bg-[linear-gradient(135deg,_rgba(236,245,255,0.95),_rgba(238,248,245,0.92))]",
    active: "bg-[#1d3557] text-white shadow-[0_16px_40px_rgba(29,53,87,0.16)]",
  },
  admin: {
    badge: "bg-[#f8eadc] text-[#91501d]",
    banner: "bg-[linear-gradient(135deg,_rgba(255,243,227,0.95),_rgba(247,236,220,0.92))]",
    active: "bg-[#7a4218] text-white shadow-[0_16px_40px_rgba(122,66,24,0.16)]",
  },
} as const;

export function PortalShell({
  tone,
  portalName,
  headline,
  summary,
  userName,
  userEmail,
  navItems,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const theme = toneStyles[tone];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="border-b border-[#281f1614] bg-white/45 px-5 py-6 lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Logo />
            <span className={`eyebrow rounded-full px-3 py-2 text-[11px] ${theme.badge}`}>
              {portalName}
            </span>
          </div>

          <div className="rounded-[1.75rem] border border-[#281f1614] bg-white/70 p-5">
            <p className="text-sm text-[#6d6257]">Signed in as</p>
            <p className="mt-2 text-lg font-semibold text-[#1e1914]">{userName || "Portal user"}</p>
            <p className="mt-1 text-sm text-[#6d6257]">{userEmail || "No email available"}</p>
          </div>

          <nav className="grid gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  className={`rounded-[1.5rem] border border-[#281f1614] px-4 py-3 transition ${
                    isActive ? theme.active : "bg-white/55 text-[#2d251f] hover:bg-white/80"
                  }`}
                  href={item.href}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className={`mt-1 text-xs leading-5 ${isActive ? "text-white/75" : "text-[#6d6257]"}`}>
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center justify-between gap-4 rounded-[1.5rem] border border-[#281f1614] bg-white/60 p-4">
            <div>
              <p className="text-sm font-semibold text-[#1e1914]">Phase 1 shell</p>
              <p className="mt-1 text-xs leading-5 text-[#6d6257]">
                Auth, routing, home, and profile scaffolding are ready to grow.
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className={`rounded-[2rem] border border-[#281f1614] p-6 shadow-[0_24px_70px_rgba(90,56,24,0.08)] ${theme.banner}`}>
          <p className="eyebrow text-xs text-[#6d6257]">{portalName}</p>
          <h1 className="headline mt-3 text-3xl font-semibold text-[#1e1914] sm:text-4xl">{headline}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c544c] sm:text-base">{summary}</p>
        </div>

        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
