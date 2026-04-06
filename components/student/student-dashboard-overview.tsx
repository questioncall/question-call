const studentMetrics = [
  {
    label: "Question access",
    value: "Trial ready",
    note: "Student accounts are initialized for the future 3-day trial flow and paid renewal logic.",
  },
  {
    label: "Peer rewards",
    value: "Points engine soon",
    note: "The profile view already reserves space for AI-validated points and leaderboard activity.",
  },
  {
    label: "Answer flow",
    value: "Portal scaffolded",
    note: "Ask, feed, inbox, and leaderboard routes are in place so Phase 2 can plug in quickly.",
  },
] as const;

const studentActions = [
  "Ask a question with tier and visibility controls in Phase 2.",
  "Track private answers and teacher communication inside the inbox and channel flow.",
  "Use future points to reduce renewal cost once payment features arrive.",
] as const;

export function StudentDashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        {studentMetrics.map((metric) => (
          <div key={metric.label} className="section-frame rounded-[1.75rem] p-5">
            <p className="eyebrow text-[11px] text-[#6d6257]">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-[#1e1914]">{metric.value}</p>
            <p className="mt-3 text-sm leading-6 text-[#5c544c]">{metric.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="section-frame rounded-[1.75rem] p-6">
          <p className="eyebrow text-[11px] text-[#6d6257]">Student profile</p>
          <h2 className="headline mt-3 text-2xl font-semibold text-[#1e1914]">Built for asking, tracking, and learning</h2>
          <p className="mt-4 text-sm leading-7 text-[#5c544c]">
            This profile view gives us the protected account space for the student experience: subscription status,
            points, personal progress, and future channel history, while the root page can focus on the shared feed.
          </p>
        </div>

        <div className="section-frame rounded-[1.75rem] p-6">
          <p className="eyebrow text-[11px] text-[#6d6257]">What comes next</p>
          <div className="mt-4 space-y-3">
            {studentActions.map((action) => (
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
