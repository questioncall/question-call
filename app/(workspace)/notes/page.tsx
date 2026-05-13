import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { createNoIndexMetadata } from "@/lib/seo";
import { NotesClient } from "./notes-client";

export const dynamic = "force-dynamic";
export const metadata = createNoIndexMetadata({
  title: "Notes",
  description: "Browse and share study notes with the community.",
});

export default async function NotesPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/settings");
  }

  return <NotesClient />;
}
