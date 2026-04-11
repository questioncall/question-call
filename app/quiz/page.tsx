import { redirect } from "next/navigation";

import { QuizHubClient } from "@/components/quiz/quiz-hub-client";
import { getDefaultPath, getSafeServerSession } from "@/lib/auth";

export default async function QuizHubPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "STUDENT") {
    redirect(getDefaultPath(session.user.role));
  }

  return <QuizHubClient />;
}
