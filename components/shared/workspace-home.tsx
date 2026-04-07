import { ArrowUpRightIcon, BookOpenIcon, MessageSquareIcon, ThumbsUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type WorkspaceRole = "STUDENT" | "TEACHER";

type WorkspaceHomeProps = {
  role: WorkspaceRole;
  name?: string | null;
};

const feedItems = [
  {
    author: "Anjana Koirala",
    time: "6 min ago",
    subject: "Physics",
    tier: "Tier I",
    visibility: "Public",
    title: "Why does current split in a parallel circuit instead of staying equal?",
    body:
      "I understand the formula but not the intuition. Can someone explain it in a way that connects resistance and current flow?",
    chips: ["Class 10", "Electricity", "Exam prep"],
    answers: 8,
    reactions: 21,
    previewAuthor: "Rohit Sir",
    previewText:
      "Think of each branch as a different path width. Lower resistance behaves like a wider road, so more charge moves there in the same time.",
  },
  {
    author: "Suman Basnet",
    time: "18 min ago",
    subject: "Mathematics",
    tier: "Tier II",
    visibility: "Private",
    title: "Need a photo-based explanation for completing the square quickly.",
    body:
      "I can solve the steps slowly, but I want a simple visual pattern for turning a quadratic into vertex form during revision.",
    chips: ["Algebra", "Quadratics", "Revision"],
    answers: 3,
    reactions: 12,
    previewAuthor: "Meera Tutor",
    previewText:
      "I would sketch the square blocks first, then show how the missing corner becomes the constant you add and subtract.",
  },
  {
    author: "Pratik Joshi",
    time: "42 min ago",
    subject: "Chemistry",
    tier: "Tier III",
    visibility: "Public",
    title: "Looking for a video answer on balancing redox reactions in acidic medium.",
    body:
      "I keep mixing oxidation numbers and half-reactions. A narrated walkthrough would help me see the pattern.",
    chips: ["Redox", "Chemistry", "Board exam"],
    answers: 5,
    reactions: 17,
    previewAuthor: "Kiran Faculty",
    previewText:
      "Start by separating oxidation and reduction clearly, then equalize oxygen with water and hydrogen with H+ before balancing charge.",
  },
] as const;

const rightRailItems = [
  {
    title: "Today’s queue",
    value: "26 open questions",
    text: "Most activity is coming from mathematics, physics, and SEE revision topics.",
  },
  {
    title: "Fastest replies",
    value: "14 min average",
    text: "Tier I questions are moving fastest, while video requests are still sparse.",
  },
  {
    title: "Community prompt",
    value: "Share one solved concept",
    text: "Posting one clear explanation today increases your visibility in the feed.",
  },
] as const;

export function WorkspaceHome({ role, name }: WorkspaceHomeProps) {
  const composerLabel =
    role === "STUDENT"
      ? "Ask a fresh question, add context, and choose what kind of answer you want back."
      : "Share a solution idea, post a teaching note, or draft a sample answer for the feed.";

  const primaryAction = role === "STUDENT" ? "Post question" : "Post teaching note";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Home feed</CardTitle>
            <CardDescription>
              Welcome back{typeof name === "string" && name ? `, ${name}` : ""}. This is the shared center column where questions and answers will live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Start something new</p>
              <p className="mt-1 text-sm text-muted-foreground">{composerLabel}</p>
              <Textarea
                className="mt-4 min-h-28 resize-none bg-background"
                placeholder="What topic are you stuck on? Add the concept, chapter, or exact confusion here..."
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm">{primaryAction}</Button>
                <Button size="sm" variant="outline">
                  Add image
                </Button>
                <Button size="sm" variant="outline">
                  Choose tier
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "All questions",
                "Recent answers",
                "Tier I",
                "Tier II",
                "Video requests",
              ].map((filter) => (
                <Button key={filter} size="sm" variant="outline">
                  {filter}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {feedItems.map((item) => (
          <Card key={`${item.author}-${item.title}`} className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardDescription>
                {item.author} • {item.time} • {item.subject}
              </CardDescription>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  {item.tier}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  {item.visibility}
                </span>
                {item.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <p className="text-sm leading-7 text-muted-foreground">{item.body}</p>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Top answer preview
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{item.previewAuthor}</p>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">{item.previewText}</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                  <MessageSquareIcon className="size-3.5" />
                  {item.answers} answers
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                  <ThumbsUpIcon className="size-3.5" />
                  {item.reactions} reactions
                </span>
              </div>
              <Button size="sm" variant="ghost">
                Open thread
                <ArrowUpRightIcon />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>What this layout is for</CardTitle>
            <CardDescription>
              Sidebar for navigation, GitHub-style header for control, and a central feed for questions and answers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              This is a dummy content pass so we can shape the SPA-style shell first. Real data can plug into the same sections later.
            </div>
            <Separator />
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-primary" />
                Home acts as the shared question-and-answer feed.
              </div>
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-primary" />
                Profile, settings, and subscription now sit outside role-specific URLs.
              </div>
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-primary" />
                The shell is ready for shadcn-driven expansion without more visual cleanup first.
              </div>
            </div>
          </CardContent>
        </Card>

        {rightRailItems.map((item) => (
          <Card key={item.title} className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle>{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
