import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { QuestionsClient } from "./questions-client";

export default async function AdminQuestionsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <QuestionsClient />;
}
