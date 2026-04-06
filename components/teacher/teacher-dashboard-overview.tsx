const teacherMetrics = [
  {
    label: "Answer queue",
    value: "Questions route ready",
    note: "The teacher portal already has a dedicated question feed route waiting for Phase 2 acceptance logic.",
  },
  {
    label: "Monetization",
    value: "Wallet scaffolded",
    note: "Wallet and qualification progress can plug in cleanly during the earnings phase.",
  },
  {
    label: "Channel work",
    value: "Messaging slot created",
    note: "Dynamic channel routing is prepared for real-time chat, answer submission, and close flow rules.",
  },
] as const;

const teacherActions = [
  "Browse open academic questions from a dedicated teacher workspace.",
  "Accept a question and work through a private student-teacher channel.",
  "Track answer count, monetization unlock progress, and later withdrawal history.",
] as const;

export function TeacherDashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        {teacherMetrics.map((metric) => (
          <div key={metric.label} className="section-frame rounded-[1.75rem] p-5">
            <p className="eyebrow text-[11px] text-[#6d6257]">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-[#1e1914]">{metric.value}</p>
            <p className="mt-3 text-sm leading-6 text-[#5c544c]">{metric.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="section-frame rounded-[1.75rem] p-6">
          <p className="eyebrow text-[11px] text-[#6d6257]">Teacher workflow</p>
          <h2 className="headline mt-3 text-2xl font-semibold text-[#1e1914]">Solve with structure, timing, and ratings</h2>
          <p className="mt-4 text-sm leading-7 text-[#5c544c]">
            The teacher shell is ready for time-boxed question acceptance, rating feedback, answer submission by tier,
            and the later wallet flow tied to solved channels.
          </p>
        </div>

        <div className="section-frame rounded-[1.75rem] p-6">
          <p className="eyebrow text-[11px] text-[#6d6257]">What comes next</p>
          <div className="mt-4 space-y-3">
            {teacherActions.map((action) => (
              <div key={action} className="rounded-2xl border border-[#281f1614] bg-white/70 px-4 py-3 text-sm leading-6 text-[#433b33]">
                {action}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
