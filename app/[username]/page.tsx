import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  AwardIcon,
  BookOpenIcon,
  MessageSquareIcon,
  StarIcon,
} from "lucide-react";

import { GuestHeader } from "@/components/shared/guest-header";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { Button } from "@/components/ui/button";
import { getDefaultPath, getSafeServerSession, getWorkspaceUser } from "@/lib/auth";
import { getPublicUserByUsername } from "@/lib/user-directory";
import {
  getMessagesPath,
  getSettingsPath,
  getSignInPath,
  getUserHandle,
} from "@/lib/user-paths";

const studentActivity = [
  {
    title: "Electricity revision set",
    text: "Collected circuit questions, short notes, and answer previews for the next unit test.",
    meta: "3 public answers • 2 private follow-ups",
  },
  {
    title: "Quadratic formula checkpoint",
    text: "Saved algebra doubts and reviewed two teacher explanations for faster exam revision.",
    meta: "1 solved thread • 1 pending clarification",
  },
  {
    title: "Peer answer streak",
    text: "Shared short concept explanations with classmates to keep points and momentum climbing.",
    meta: "5 valid peer answers this week",
  },
] as const;

const teacherActivity = [
  {
    title: "Physics explanation library",
    text: "Recent channels focused on current flow, resistance intuition, and SEE board preparation.",
    meta: "8 answered channels • 4.9 average rating",
  },
  {
    title: "Math walkthrough collection",
    text: "Built a reliable set of algebra and coordinate geometry replies that can later be pinned publicly.",
    meta: "6 reusable answer patterns",
  },
  {
    title: "Reputation growth",
    text: "Ratings, response speed, and answer volume are all moving toward monetization-friendly territory.",
    meta: "Qualification progress tracked from profile",
  },
] as const;

function formatJoinedDate(value?: Date | string) {
  if (!value) {
    return "Recently joined";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently joined";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Prevent hitting the database for obviously invalid or malformed usernames
  // (e.g., random bot spam, missing static files like favicon.ico, or random strings).
  // Usernames must be 3-24 characters containing only letters, numbers, hyphens, and underscores.
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) {
    notFound();
  }

  const profile = await getPublicUserByUsername(username);

  if (!profile) {
    notFound();
  }

  const session = await getSafeServerSession();

  if (session?.user?.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  const viewerHandle = session?.user ? getUserHandle(session.user) : null;
  const isOwner = viewerHandle === profile.username;
  const activityItems = profile.role === "STUDENT" ? studentActivity : teacherActivity;

  const profileContent = (
    <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 py-8">
      <div className="grid gap-8 lg:grid-cols-[296px_minmax(0,1fr)] items-start">
        {/* LEFT SIDEBAR - GitHub Style Sticky */}
        <aside className="space-y-5 lg:sticky lg:top-[5.5rem]">
          {/* Avatar */}
          <div className="relative mx-auto aspect-square w-full max-w-[296px] overflow-hidden rounded-full border border-border bg-muted shadow-sm">
            {profile.userImage ? (
              <img src={profile.userImage} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary text-6xl font-semibold text-primary-foreground drop-shadow-sm select-none">
                {(profile.name || profile.username).slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Name and Handle */}
          <div className="space-y-1 py-1">
            <h1 className="text-2xl font-bold leading-tight text-foreground">{profile.name}</h1>
            <h2 className="text-xl font-light text-muted-foreground">{profile.username}</h2>
          </div>
          
          {/* Action Button */}
          {session?.user ? (
            isOwner ? (
               <Button asChild className="w-full font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border" variant="secondary">
                 <Link href={getSettingsPath(session.user)}>Edit profile</Link>
               </Button>
            ) : (
               <Button asChild className="w-full font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border" variant="secondary">
                 <Link href={getMessagesPath(session.user)}>Message</Link>
               </Button>
            )
          ) : (
             <Button asChild className="w-full font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border" variant="secondary">
               <Link href={getSignInPath()}>Follow</Link>
             </Button>
          )}
          
          <div className="text-sm leading-snug text-foreground whitespace-pre-wrap">
            {profile.bio || (profile.role === "STUDENT" 
              ? "Student at EduAsk. Learning and growing every day."
              : "Platform Educator. Helping students understand core concepts.")}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-foreground">
            <div className="flex items-center hover:text-primary cursor-pointer transition-colors">
              <span className="font-semibold text-foreground mr-1">
                {profile.role === "STUDENT" ? profile.points : profile.totalAnswered}
              </span>
              <span className="text-muted-foreground">{profile.role === "STUDENT" ? "points" : "answers"}</span>
            </div>
            <span>·</span>
            <div className="flex items-center hover:text-primary cursor-pointer transition-colors">
              <span className="font-semibold text-foreground mr-1">
                {profile.overallScore.toFixed(1)}
              </span>
              <span className="text-muted-foreground">rating</span>
            </div>
          </div>
          
          <div className="space-y-3 border-t border-border pt-4 text-sm text-foreground">
            <div className="flex items-center gap-2">
              <span className="w-5 text-center text-muted-foreground">📅</span>
              <span className="text-muted-foreground">Joined</span>
              <span className="ml-auto font-medium">{formatJoinedDate(profile.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center text-muted-foreground">✉️</span>
              <span className="text-muted-foreground">Email</span>
              <span className="ml-auto truncate font-medium">{isOwner ? profile.email : maskEmail(profile.email)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center text-muted-foreground">🎓</span>
              <span className="text-muted-foreground">Role</span>
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary capitalize">
                {profile.role.toLowerCase()}
                {profile.role === "TEACHER" && profile.teacherModeVerified && (
                   <span className="ml-1 text-[10px] uppercase font-bold text-emerald-500">✔ Verified</span>
                )}
              </span>
            </div>

            {profile.role === "TEACHER" && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Teacher Rating</p>
                <div className="flex items-center gap-1 text-amber-500">
                  <StarIcon className="size-4 fill-amber-500" />
                  <StarIcon className="size-4 fill-amber-500" />
                  <StarIcon className="size-4 fill-amber-500" />
                  <StarIcon className="size-4 fill-amber-500" />
                  {profile.overallScore >= 4.5 ? <StarIcon className="size-4 fill-amber-500" /> : <StarIcon className="size-4 fill-amber-500/30 text-amber-500/30" />}
                  <span className="ml-2 font-medium text-foreground">{profile.overallScore.toFixed(1)} / 5.0</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT CONTENT SIDE */}
        <div className="space-y-6 min-w-0">
          {/* GITHUB TABS */}
          <div className="sticky top-0 z-10 -mx-4 overflow-x-auto bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:mx-0 md:px-0">
            <nav className="flex gap-4 border-b border-border">
              <button className="flex items-center gap-2 border-b-2 border-primary px-2 py-3 text-sm font-semibold text-foreground">
                <BookOpenIcon className="size-4" />
                Overview
              </button>
              <button className="flex items-center gap-2 border-b-2 border-transparent px-2 py-3 text-sm font-medium text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors">
                <MessageSquareIcon className="size-4" />
                {profile.role === "STUDENT" ? "Questions Asked" : "Solved Questions"}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground font-semibold">
                  {profile.role === "STUDENT" ? profile.totalAsked || 0 : profile.totalAnswered}
                </span>
              </button>
              {profile.role === "TEACHER" && (
                <button className="flex items-center gap-2 border-b-2 border-transparent px-2 py-3 text-sm font-medium text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors">
                  <AwardIcon className="size-4" />
                  Media Answers
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground font-semibold">6</span>
                </button>
              )}
            </nav>
          </div>

          {/* README / OVERVIEW */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="text-xs text-muted-foreground mb-4">
              {profile.username} / <span className="font-semibold text-foreground">README.md</span>
            </p>
            <div className="space-y-6">
              <div className="prose prose-sm md:prose-base dark:prose-invert">
                <h2 className="text-2xl font-bold border-b border-border pb-2 mb-4">👋 Hi, I&apos;m {profile.name}</h2>
                <div className="text-muted-foreground leading-7 whitespace-pre-wrap">
                  {profile.bio || (profile.role === "STUDENT" 
                    ? "I'm a student using EduAsk to clear my doubts and learn collaboratively. I actively participate in discussions and help peers when I can."
                    : "I'm an educator dedicated to providing clear, concise, and highly visual explanations to student questions on EduAsk.")}
                </div>
                <div className="mt-6">
                  <h3 className="font-semibold text-lg text-foreground mb-3">Core Skills & Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills?.length ? (
                      profile.skills.map((tag: string) => (
                        <span key={tag} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">Physics</span>
                        <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">Calculus</span>
                        <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">Computer Science</span>
                      </>
                    )}
                  </div>
                  
                  {profile.interests && profile.interests.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Also interested in:</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((tag: string) => (
                           <span key={tag} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                             {tag}
                           </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVITY GRID */}
          <div>
            <h3 className="mb-4 text-base font-semibold text-foreground">Featured Activity</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {activityItems.map((item) => (
                <div key={item.title} className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-muted-foreground/50 cursor-pointer">
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-primary hover:underline">
                      <BookOpenIcon className="size-4" />
                      {item.title}
                    </h4>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.text}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                        {profile.role === "STUDENT" ? "Question" : "Solution"}
                      </span>
                      <span className="flex items-center gap-1 hover:text-foreground">
                        <StarIcon className="size-3" />
                        8
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  if (session?.user) {
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
    const workspaceUser = await getWorkspaceUser(session.user);

    return <WorkspaceShell user={workspaceUser} defaultOpen={defaultOpen}>{profileContent}</WorkspaceShell>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GuestHeader portalLabel="Public profile browser" />
      <main className="px-4 py-8 sm:px-6 lg:px-8">{profileContent}</main>
    </div>
  );
}


