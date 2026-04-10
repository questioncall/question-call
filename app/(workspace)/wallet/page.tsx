import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { WalletClient } from "./wallet-client";

export default async function WalletPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/pricing");
  }

  return <WalletClient />;
}
