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
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{roleRankLabel}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {roleRank ? `#${roleRank}` : "Unranked"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">All rank</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {allRanks.get(selectedUser.username)
                ? `#${allRanks.get(selectedUser.username)}`
                : "Unranked"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {activityLabel}
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{activityValue}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profile</p>
            <Link className="mt-2 inline-block text-base font-semibold text-foreground underline decoration-primary/40 underline-offset-4" href={`/${selectedUser.username}`}>
              Open /{selectedUser.username}
            </Link>
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
