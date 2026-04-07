import { redirect } from "next/navigation";

export default function LegacyStudentInboxRedirectPage() {
  redirect("/message");
}
