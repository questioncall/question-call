import { redirect } from "next/navigation";

export default function StudentDashboardRedirectPage() {
  redirect("/student/profile");
}
