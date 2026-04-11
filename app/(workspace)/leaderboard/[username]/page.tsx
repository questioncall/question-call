import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getLeaderboardProfiles,
  getLeaderboardScore,
  getPublicUserByUsername,
} from "@/lib/user-directory";
import { formatPoints } from "@/lib/points";

export default async function LeaderboardUserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [selectedUser, profiles] = await Promise.all([
    getPublicUserByUsername(username),
    getLeaderboardProfiles(),
  ]);

  if (!selectedUser) {
    notFound();
  }

  const rank = profiles.findIndex((profile) => profile.username === selectedUser.username) + 1;

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Leaderboard spotlight</CardDescription>
          <CardTitle>@{selectedUser.username}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rank</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">#{rank || profiles.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Score</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{Math.round(getLeaderboardScore(selectedUser))}</p>
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
          <CardTitle>Shared student + teacher leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.map((profile, index) => {
            const isSelected = profile.username === selectedUser.username;

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
                  <p className="text-sm text-muted-foreground">@{profile.username} • {profile.role.toLowerCase()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>{profile.totalAnswered} solved</span>
                  <span>{formatPoints(profile.points)} pts</span>
                  <span>{profile.overallScore.toFixed(1)}/5</span>
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
