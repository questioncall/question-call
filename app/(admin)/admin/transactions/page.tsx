import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { TransactionsClient } from "./transactions-client";

export default async function AdminTransactionsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <TransactionsClient />;
}
