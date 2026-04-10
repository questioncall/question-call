import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { PricingClient } from "./pricing-client";

export default async function AdminPricingPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <PricingClient />;
}
