import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { PortalShell } from "@/components/shared/portal-shell";
import { getSafeServerSession, getDefaultPath, getProfilePath } from "@/lib/auth";

const studentHomeNav = [
  {
    href: "/",
    label: "Home",
    description: "Shared home feed and quick student actions.",
  },
  {
    href: "/student/profile",
    label: "Profile",
    description: "Your student profile and account progress.",
  },
  {
    href: "/student/ask",
    label: "Ask",
    description: "Create a question with tier and visibility.",
  },
  {
    href: "/student/inbox",
    label: "Inbox",
    description: "Private answers and later channel history.",
  },
] as const;

const teacherHomeNav = [
  {
    href: "/",
    label: "Home",
    description: "Shared home feed and teaching activity.",
  },
  {
    href: "/teacher/profile",
    label: "Profile",
    description: "Your teacher profile and answer progress.",
  },
  {
    href: "/teacher/questions",
    label: "Questions",
    description: "Browse open questions and accept work.",
  },
  {
    href: "/teacher/wallet",
    label: "Wallet",
    description: "Future earnings, credits, and withdrawals.",
  },
] as const;

const sharedFeedCards = {
  STUDENT: [
    {
      title: "Common feed home",
      text: "Students land on a feed-first home where open academic questions, quick actions, and profile access can live together.",
    },
    {
      title: "Profile is separate",
      text: "Your personal account page now has its own route so the home screen can stay focused on discovery and activity.",
    },
    {
      title: "Next steps",
      text: "We can now build the real feed cards, sidebar counts, and role-aware quick actions directly on top of this root page.",
    },
  ],
  TEACHER: [
    {
      title: "Shared question home",
      text: "Teachers now land on a home page intended for the feed, question activity, and fast navigation into active work.",
    },
    {
      title: "Profile is separate",
      text: "Your profile route can focus on ratings, answer totals, and monetization progress instead of acting as the main landing screen.",
    },
    {
      title: "Next steps",
      text: "This gives us a clean place to plug in the open-question feed, accept actions, and header notifications next.",
    },
  ],
} as const;

type HomePageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getSafeServerSession();
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  if (!session?.user) {
    const loginHref = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

    return (
      <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center rounded-[2rem] border border-[#281f1614] bg-white/65 p-6 shadow-[0_28px_90px_rgba(90,56,24,0.12)] sm:p-10">
          <div className="w-full max-w-xl rounded-[2rem] border border-[#281f1614] bg-[#fff8ef]/90 p-8 text-center shadow-[0_18px_60px_rgba(90,56,24,0.08)] sm:p-10">
            <div className="flex justify-center">
              <Logo />
            </div>
            <p className="eyebrow mt-8 text-xs text-[#6d6257]">EduAsk Home</p>
            <h1 className="headline mt-4 text-4xl font-semibold text-[#1e1914] sm:text-5xl">
              Login or register to enter the app.
            </h1>
            <p className="mt-5 text-sm leading-7 text-[#5c544c] sm:text-base">
              For now, the public home stays simple. Once you sign in, this same route becomes the authenticated app home with the feed, sidebar, and header layout.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link className="rounded-2xl bg-[#1e1914] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#352c24]" href={loginHref}>
                Login
              </Link>
              <Link
                className="rounded-2xl border border-[#281f1614] bg-white/85 px-5 py-3 text-sm font-semibold text-[#2d251f] transition hover:bg-white"
                href="/register/student"
              >
                Register
              </Link>
            </div>
            <p className="mt-4 text-sm text-[#6d6257]">
              Registering as a teacher instead?{" "}
              <Link className="font-semibold text-[#1e1914] underline decoration-[#1f766e] underline-offset-4" href="/register/teacher">
                Use the teacher signup page
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (session.user.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  const isStudent = session.user.role === "STUDENT";
  const navItems = isStudent ? studentHomeNav : teacherHomeNav;
  const tone = isStudent ? "student" : "teacher";
  const portalName = isStudent ? "Student Home" : "Teacher Home";
  const profileHref = getProfilePath(session.user.role);
  const feedCards = sharedFeedCards[session.user.role];

  return (
    <PortalShell
      headline="This is now the authenticated app home."
      navItems={navItems.map((item) => ({ ...item }))}
      portalName={portalName}
      summary="We can build the actual shared feed here next, while keeping profile details in a dedicated route instead of treating the profile page as the landing screen."
      tone={tone}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="section-frame rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-[11px] text-[#6d6257]">Feed Area</p>
              <h2 className="headline mt-3 text-3xl font-semibold text-[#1e1914]">Home feed scaffold</h2>
            </div>
            <Link
              className="rounded-2xl border border-[#281f1614] bg-white/80 px-4 py-3 text-sm font-semibold text-[#2d251f] transition hover:bg-white"
              href={profileHref}
            >
              Open profile
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {feedCards.map((card) => (
              <article key={card.title} className="rounded-[1.5rem] border border-[#281f1614] bg-white/75 p-5">
                <h3 className="text-lg font-semibold text-[#1e1914]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5c544c]">{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="section-frame rounded-[1.75rem] p-6">
            <p className="eyebrow text-[11px] text-[#6d6257]">Quick access</p>
            <div className="mt-4 grid gap-3">
              {navItems.slice(1).map((item) => (
                <Link
                  key={item.href}
                  className="rounded-2xl border border-[#281f1614] bg-white/75 px-4 py-3 transition hover:bg-white"
                  href={item.href}
                >
                  <p className="text-sm font-semibold text-[#1e1914]">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#6d6257]">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="section-frame rounded-[1.75rem] p-6">
            <p className="eyebrow text-[11px] text-[#6d6257]">Header plan</p>
            <p className="mt-4 text-sm leading-7 text-[#5c544c]">
              This page already has the shared shell pieces you asked for: a sidebar, a top header area, and a main feed column. We can now start replacing these placeholder cards with the real question feed UI.
            </p>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}


