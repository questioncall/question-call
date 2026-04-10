import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { FormatClient } from "./format-client";

export default async function AdminFormatConfigPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <FormatClient />;
}
