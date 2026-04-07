import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const threads = [
  {
    id: "chn_101",
    topic: "parallel-circuit-current",
    title: "Why does current split in a parallel circuit?",
    counterpart: "Rohit Sir",
    preview: "Start by thinking of each branch like a different width road...",
    status: "Active",
  },
  {
    id: "chn_214",
    topic: "completing-the-square-shortcut",
    title: "Need a faster way to complete the square",
    counterpart: "Meera Tutor",
    preview: "Picture the missing corner of the square before touching the formula.",
    status: "Waiting for rating",
  },
  {
    id: "chn_315",
    topic: "redox-reaction-video-request",
    title: "Video help for balancing redox reactions",
    counterpart: "Anjana Koirala",
    preview: "I can explain the half-reaction method once you confirm the acidic-medium step.",
    status: "Shared with peer",
  },
] as const;

export default function MessagesPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Channels</CardDescription>
          <CardTitle>/message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              className="block rounded-xl border border-border bg-muted/20 p-4 transition hover:border-primary/50 hover:bg-background"
              href={`/channel/${thread.id}/${thread.topic}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{thread.counterpart}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{thread.title}</p>
                </div>
                <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {thread.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{thread.preview}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Message workspace</CardDescription>
            <CardTitle>Instagram-style channel list on the left, active conversation on the right</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              This page is the shared home for every private communication thread between students, teachers, and peer students.
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              Each card opens the canonical channel route at `/channel/[id]/[topic]`, which keeps URLs descriptive and readable.
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Selected preview</CardDescription>
            <CardTitle>{threads[0].title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4 text-sm text-foreground">
              <p className="font-medium">Rohit Sir</p>
              <p className="mt-2 leading-7 text-muted-foreground">{threads[0].preview}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-sm text-foreground">
              <p className="font-medium">You</p>
              <p className="mt-2 leading-7 text-muted-foreground">
                I understand the formula, but I still want the intuition behind why each branch gets a different amount of current.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
