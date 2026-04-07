import { BellRingIcon, LockIcon, ShieldCheckIcon } from "lucide-react";

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

const settingSections = [
  {
    title: "Account details",
    text: "Change your visible profile information, email preferences, and identity settings here.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Notifications",
    text: "Choose how quickly you hear about new answers, accepted threads, and payment reminders.",
    icon: BellRingIcon,
  },
  {
    title: "Privacy controls",
    text: "Decide which answers stay private and how much activity is shown to the rest of the platform.",
    icon: LockIcon,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Settings</CardDescription>
          <CardTitle>Workspace settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            This route is the shared place for personal preferences, notifications, and
            account controls. It is no longer tied to a student or teacher-specific path.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {settingSections.map((section) => (
          <Card key={section.title} className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <section.icon className="size-4 text-primary" />
                {section.title}
              </CardDescription>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">{section.text}</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                Configure
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Notification preview</CardTitle>
          <CardDescription>Dummy preferences while the real form is still pending.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <span>Instant alerts for accepted questions</span>
            <span className="font-medium text-foreground">Enabled</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <span>Daily digest email</span>
            <span className="font-medium text-foreground">Paused</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <span>Marketing updates</span>
            <span className="font-medium text-foreground">Off</span>
          </div>
          <Separator />
          <Button size="sm">Save dummy settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
