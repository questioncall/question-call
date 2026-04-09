import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { SubscriptionClient } from "./subscription-client";

export default async function SubscriptionPage() {
  const session = await getSafeServerSession();
  
  if (session?.user?.role === "TEACHER") {
    redirect("/wallet");
  }

  return <SubscriptionClient />;
}
