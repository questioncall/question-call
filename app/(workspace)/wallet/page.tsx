import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { WalletClient } from "./wallet-client";

export default async function WalletPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "TEACHER") {
    redirect("/subscription");
  }

  return <WalletClient />;
}
