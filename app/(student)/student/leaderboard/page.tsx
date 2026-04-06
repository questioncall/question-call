import Link from "next/link";

export default function StudentLeaderboardPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Competition</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Leaderboard</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        Leaderboard rankings and competition cycles will be added here once the
        gamification phase is implemented.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white" href="/student/profile">
          Open profile
        </Link>
        <Link className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}
