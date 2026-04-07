import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

function formatTopicLabel(topic: string) {
  return topic
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string; topic: string }>;
}) {
  const { id, topic } = await params;
  const topicLabel = formatTopicLabel(topic);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Channel workspace</CardDescription>
          <CardTitle>{topicLabel}</CardTitle>
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
            Dummy chat UI for now. The real version will hold live messages, uploads, answer submission, rating, and close-channel controls.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Route details</CardDescription>
            <CardTitle>/channel/{id}/{topic}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              Channel ID stays technical for database lookup.
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              Topic slug keeps the URL readable and shareable.
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              This route is protected, but the public profile route is not.
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>Dummy channel controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
              <span>Timer</span>
              <span className="font-medium text-foreground">18m left</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
              <span>Required answer type</span>
              <span className="font-medium text-foreground">Tier I</span>
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
