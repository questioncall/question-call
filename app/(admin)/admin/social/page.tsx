import { getSafeServerSession, getProfilePath } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SocialClient } from "./social-client";

export default async function SocialPage() {
  const session = await getSafeServerSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <SocialClient />;
}
