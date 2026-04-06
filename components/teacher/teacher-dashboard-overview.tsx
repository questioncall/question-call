const teacherMetrics = [
  {
    label: "Answer queue",
    value: "Questions ready",
    note: "This area will connect to the teacher question feed and accept flow.",
  },
  {
    label: "Monetization",
    value: "Wallet later",
    note: "Earnings and qualification progress will appear here after the wallet phase.",
  },
  {
    label: "Channel work",
    value: "Channel route ready",
    note: "The channel page is ready to become the messaging workspace.",
  },
] as const;

const teacherActions = [
  "Browse and accept open questions.",
  "Submit answers by the required tier.",
  "Track ratings and earnings over time.",
] as const;

export function TeacherDashboardOverview() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Teacher profile</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Your teacher workspace</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          This page will hold ratings, answer totals, qualification progress, and wallet
          information. For now the UI stays flat and minimal so the later app-shell work
          is easier to build on top of it.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {teacherMetrics.map((metric) => (
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
          {teacherActions.map((action) => (
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
