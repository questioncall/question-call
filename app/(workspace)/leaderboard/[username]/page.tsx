import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getLeaderboardMetricLabel,
  getLeaderboardMetricValue,
  getLeaderboardProfiles,
  getPublicUserByUsername,
  type LeaderboardGroup,
  type PublicDirectoryUser,
} from "@/lib/user-directory";
import { getSafeServerSession } from "@/lib/auth";

const leaderboardSections: Array<{
  key: LeaderboardGroup;
  title: string;
  description: string;
}> = [
  {
    key: "students",
    title: "Student vs Student",
    description: "Students ranked by total questions asked.",
  },
  {
    key: "teachers",
    title: "Teacher vs Teacher",
    description: "Teachers ranked by total questions solved.",
  },
  {
    key: "all",
    title: "All",
    description: "Combined ranking with students and teachers together.",
  },
];

function createRankMap(profiles: PublicDirectoryUser[]) {
  return new Map(
    profiles.map((profile, index) => [profile.username, index + 1] as const),
  );
}

function isLeaderboardGroup(value?: string): value is LeaderboardGroup {
  return value === "students" || value === "teachers" || value === "all";
}

type LeaderboardUserPageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
};

export default async function LeaderboardUserPage({
  params,
  searchParams,
}: LeaderboardUserPageProps) {
  const [session, { username }] = await Promise.all([
    getSafeServerSession(),
    params,
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const [selectedUser, studentProfiles, teacherProfiles, allProfiles] = await Promise.all([
    getPublicUserByUsername(username),
    getLeaderboardProfiles("students"),
    getLeaderboardProfiles("teachers"),
    getLeaderboardProfiles("all"),
  ]);

  if (!selectedUser) {
    notFound();
  }

  const studentRanks = createRankMap(studentProfiles);
  const teacherRanks = createRankMap(teacherProfiles);
  const allRanks = createRankMap(allProfiles);

  const roleRank =
    selectedUser.role === "STUDENT"
      ? studentRanks.get(selectedUser.username)
      : teacherRanks.get(selectedUser.username);
  const roleRankLabel =
    selectedUser.role === "STUDENT" ? "Student rank" : "Teacher rank";
  const activityValue = getLeaderboardMetricValue(selectedUser, "all");
  const activityLabel = getLeaderboardMetricLabel(selectedUser, "all");
  const profilesBySection: Record<LeaderboardGroup, PublicDirectoryUser[]> = {
    students: studentProfiles,
    teachers: teacherProfiles,
    all: allProfiles,
  };
  const allowedSections =
    session.user.role === "STUDENT"
      ? (["students", "all"] as LeaderboardGroup[])
      : (["teachers", "all"] as LeaderboardGroup[]);
  const defaultSection = allowedSections[0];
  const requestedView =
    typeof resolvedSearchParams?.view === "string"
      ? resolvedSearchParams.view
      : undefined;
  const requestedSection = isLeaderboardGroup(requestedView)
    ? requestedView
    : undefined;
  const activeSection =
    requestedSection && allowedSections.includes(requestedSection)
      ? requestedSection
      : defaultSection;
  const activeSectionConfig =
    leaderboardSections.find((section) => section.key === activeSection) ??
    leaderboardSections.find((section) => section.key === defaultSection) ??
    leaderboardSections[0];
  const activeProfiles = profilesBySection[activeSectionConfig.key];

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Leaderboard spotlight</CardDescription>
          <CardTitle>@{selectedUser.username}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.04),rgba(34,197,94,0.08))] p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Spotlight
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                    {selectedUser.role.toLowerCase()}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground sm:text-3xl">{selectedUser.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">@{selectedUser.username}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {roleRankLabel}: {roleRank ? `#${roleRank}` : "Unranked"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                    All rank: {allRanks.get(selectedUser.username) ? `#${allRanks.get(selectedUser.username)}` : "Unranked"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {activityValue} {activityLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  href={`/${selectedUser.username}`}
                >
                  Open /{selectedUser.username}
                </Link>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <div className="rounded-2xl border border-border/70 bg-background/85 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {roleRankLabel}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {roleRank ? `#${roleRank}` : "Unranked"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/85 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Activity
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{activityValue}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Rankings</CardDescription>
          <CardTitle>{activeSectionConfig.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{activeSectionConfig.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {leaderboardSections
              .filter((section) => allowedSections.includes(section.key))
              .map((section) => {
              const isActive = section.key === activeSectionConfig.key;

              return (
                <Button
                  key={section.key}
                  asChild
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                >
                  <Link href={`/leaderboard/${selectedUser.username}?view=${section.key}`}>
                    {section.title}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeProfiles.map((profile, index) => {
            const isSelected = profile.username === selectedUser.username;
            const metricValue = getLeaderboardMetricValue(
              profile,
              activeSectionConfig.key,
            );
            const metricLabel = getLeaderboardMetricLabel(
              profile,
              activeSectionConfig.key,
            );

            return (
              <div
                key={profile.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-background"
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">
                    #{index + 1} {profile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{profile.username} • {profile.role.toLowerCase()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {metricValue} {metricLabel}
                  </span>
                  {profile.role === "TEACHER" ? (
                    <span>{profile.overallScore.toFixed(1)}/5 rating</span>
                  ) : (
                    <span>{profile.points} pts</span>
                  )}
                  <Link className="font-medium text-foreground underline decoration-primary/40 underline-offset-4" href={`/${profile.username}`}>
                    View profile
                  </Link>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
