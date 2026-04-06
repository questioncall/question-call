import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function StudentLeaderboardPage() {
  return (
    <PagePlaceholder
      description="Leaderboard aggregation and weekly competition controls will plug into this page during the gamification phase."
      eyebrow="Competition"
      primaryHref="/student/profile"
      primaryLabel="Open profile"
      secondaryHref="/"
      secondaryLabel="Return home"
      title="Leaderboard scaffolded"
    />
  );
}
