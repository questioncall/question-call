import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const channelDirectory: Record<string, { title: string; counterpart: string; requiredAnswer: string }> = {
  chn_101: {
    title: "Why does current split in a parallel circuit?",
    counterpart: "Rohit Sir",
    requiredAnswer: "Tier I",
  },
  chn_214: {
    title: "Need a faster way to complete the square",
    counterpart: "Meera Tutor",
    requiredAnswer: "Tier II",
  },
  chn_315: {
    title: "Video help for balancing redox reactions",
    counterpart: "Anjana Koirala",
    requiredAnswer: "Tier III",
  },
};

const sampleMessages = [
  {
    sender: "Student",
    text: "I know the formula for current split, but I want the intuition in plain language.",
  },
  {
    sender: "Teacher",
    text: "Imagine charge choosing between roads. Lower resistance is the wider road, so more current moves there in the same time.",
  },
  {
    sender: "Student",
    text: "That makes sense. Could you also relate it to voltage staying the same across each branch?",
  },
  {
    sender: "Teacher",
    text: "Yes. Because each branch sees the same voltage, current only changes according to how hard each path resists that shared push.",
  },
] as const;

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const channel = channelDirectory[id] ?? {
    title: `Channel ${id}`,
    counterpart: "Shared thread",
    requiredAnswer: "Flexible",
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Shared channel workspace</CardDescription>
          <CardTitle>{channel.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sampleMessages.map((message, index) => (
            <div
              key={`${message.sender}-${index}`}
              className={`max-w-3xl rounded-2xl border px-4 py-3 text-sm leading-7 ${
                message.sender === "Teacher"
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-muted/20"
              }`}
            >
              <p className="font-medium text-foreground">{message.sender}</p>
              <p className="mt-2 text-muted-foreground">{message.text}</p>
            </div>
          ))}

          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
            One shared channel route serves both students and teachers. Only the data, permissions, and UI state should differ by role.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Route details</CardDescription>
            <CardTitle>/channel/{id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              Channel ID is the only canonical route key now.
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              Thread title and other presentation details should come from real channel data, not the URL.
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              The same route works for student-teacher and student-student conversations.
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>{channel.counterpart}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
              <span>Timer</span>
              <span className="font-medium text-foreground">18m left</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
              <span>Required answer type</span>
              <span className="font-medium text-foreground">{channel.requiredAnswer}</span>
            </div>
            <Button asChild className="w-full">
              <Link href="/message">Back to messages</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
