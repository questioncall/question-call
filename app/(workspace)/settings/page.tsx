import Link from "next/link";
import { BellIcon, ChevronRightIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createNoIndexMetadata } from "@/lib/seo";

const settingSections = [
  {
    title: "Update Account Settings",
    text: "Edit your profile details, avatar, bio, and the information people see across the platform.",
    href: "/settings/profile",
    cta: "Open account settings",
    icon: UserIcon,
  },
  {
    title: "Call Settings",
    text: "Choose separate incoming and outgoing call tones, and decide whether incoming calls stay silent.",
    href: "/settings/calls",
    cta: "Open call settings",
    icon: BellIcon,
  },
] as const;

export const dynamic = "force-dynamic";
export const metadata = createNoIndexMetadata({
  title: "Settings",
  description: "Manage your Question Call workspace settings and preferences.",
});

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Settings</CardDescription>
          <CardTitle>Choose a settings area</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Your settings route now works like a small hub. Pick the area you want
            to update and we will take you straight to that form.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
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
              <p className="text-sm leading-7 text-muted-foreground">
                {section.text}
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild size="sm" className="gap-2">
                <Link href={section.href}>
                  {section.cta}
                  <ChevronRightIcon className="size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
