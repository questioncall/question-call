import { redirect } from "next/navigation";

export default function LegacyStudentAskRedirectPage() {
  redirect("/ask/question");
}
