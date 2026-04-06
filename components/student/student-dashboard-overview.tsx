const studentMetrics = [
  {
    label: "Question access",
    value: "Trial ready",
    note: "Student accounts are initialized for the future trial and subscription flow.",
  },
  {
    label: "Peer rewards",
    value: "Points later",
    note: "This page will show points and answer validation progress once that feature lands.",
  },
  {
    label: "Answer flow",
    value: "Routes ready",
    note: "Ask, feed, inbox, and leaderboard pages are already in place.",
  },
] as const;

const studentActions = [
  "Create and manage questions.",
  "Track private answers and channel history.",
  "View points and leaderboard progress.",
] as const;

export function StudentDashboardOverview() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Student profile</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Your student workspace</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          This page will hold subscription details, points, progress, and personal
          activity. The layout is intentionally plain for now so we can rebuild the UI
          cleanly with shadcn later.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {studentMetrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{metric.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Planned sections</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {studentActions.map((action) => (
            <div
              key={action}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {action}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
