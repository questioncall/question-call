import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <SettingsClient user={session.user} />;
}
