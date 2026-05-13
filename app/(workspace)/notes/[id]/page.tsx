import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { createNoIndexMetadata } from "@/lib/seo";
import { NoteDetailClient } from "./note-detail-client";

export const dynamic = "force-dynamic";
export const metadata = createNoIndexMetadata({
  title: "Note",
  description: "View study note details.",
});

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/settings");
  }

  const { id } = await params;

  return <NoteDetailClient noteId={id} />;
}
