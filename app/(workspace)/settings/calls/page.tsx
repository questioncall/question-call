import { redirect } from "next/navigation";
import { BellIcon } from "lucide-react";

import { CallSettingsForm } from "@/components/shared/call-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { normalizeCallSettings } from "@/lib/call-settings";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { createNoIndexMetadata } from "@/lib/seo";
import User, { type UserRecord } from "@/models/User";

export const dynamic = "force-dynamic";
export const metadata = createNoIndexMetadata({
  title: "Call Settings",
  description:
    "Choose separate incoming and outgoing call tones, plus whether incoming calls stay silent.",
});

export default async function SettingsCallsPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  await connectToDatabase();
  const dbUser = await User.findById(session.user.id)
    .select("callSettings")
    .lean<Pick<UserRecord, "callSettings"> | null>();

  if (!dbUser) {
    redirect("/auth/signin");
  }

  const serializedSettings = normalizeCallSettings(dbUser.callSettings);

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <BellIcon className="size-4 text-primary" />
            Calls
          </CardDescription>
          <CardTitle>Call Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <CallSettingsForm initialSettings={serializedSettings} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
