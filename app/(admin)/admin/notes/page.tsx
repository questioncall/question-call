import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { NotesClient } from "./notes-client";

export default async function AdminNotesPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <NotesClient />;
}
