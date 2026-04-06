import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { getSafeServerSession, getDefaultPath } from "@/lib/auth";

const homeLinksByRole = {
  STUDENT: [
    {
      href: "/student/profile",
      label: "Profile",
      description: "Account details, subscription state, and future progress.",
    },
    {
      href: "/student/ask",
      label: "Ask",
      description: "Create a new question when we wire the composer.",
    },
    {
      href: "/student/feed",
      label: "Feed",
      description: "Browse the shared question feed once it is built.",
    },
    {
      href: "/student/inbox",
      label: "Inbox",
      description: "Private answers and channel history will live here.",
    },
  ],
  TEACHER: [
    {
      href: "/teacher/profile",
      label: "Profile",
      description: "Ratings, activity, and monetization progress.",
    },
    {
      href: "/teacher/questions",
      label: "Questions",
      description: "Open questions and future accept actions.",
    },
    {
      href: "/teacher/wallet",
      label: "Wallet",
      description: "Earnings, payouts, and withdrawals later on.",
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
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  if (!session?.user) {
    const loginHref = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";

    return (
      <main className="min-h-screen bg-[#f7f7f8]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <Logo />
            <section className="mt-8 space-y-4">
              <p className="text-sm font-medium text-slate-500">Home</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Sign in or create an account.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                The public home is intentionally simple for now. We will replace the
                signed-in experience with a cleaner app layout once the shadcn-based
                sidebar and header are ready.
              </p>
            </section>

            <section className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                href={loginHref}
              >
                Sign in
              </Link>
              <Link
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                href="/register/student"
              >
                Register as student
              </Link>
              <Link
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                href="/register/teacher"
              >
                Register as teacher
              </Link>
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (session.user.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  const roleLabel = session.user.role === "STUDENT" ? "Student" : "Teacher";
  const quickLinks = homeLinksByRole[session.user.role];

  return (
    <main className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-slate-500">Signed in as {roleLabel.toLowerCase()}</p>
          </div>
          <SignOutButton />
        </header>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Home</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Welcome, {session.user.name || roleLabel}.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            This is the simple authenticated home for now. We have removed the extra
            scaffold UI so we can rebuild the app shell cleanly with a left sidebar
            and top header later.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              href={item.href}
            >
              <h2 className="text-lg font-semibold text-slate-900">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Next UI step</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Once you install the shadcn pieces you want, I can turn this into a
            GitHub-style app shell with a persistent sidebar, top header, and SPA-like
            page transitions on top of the App Router.
          </p>
        </section>
      </div>
    </main>
  );
}
