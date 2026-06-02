import { notFound, redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { getChapterManageData } from "@/lib/chapter-page-data";
import { createNoIndexMetadata } from "@/lib/seo";
import { ChapterManageClient } from "./chapter-manage-client";

export const metadata = createNoIndexMetadata({
  title: "Manage Chapter",
  description: "Create and manage chapter content.",
});

export default async function ManageChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSafeServerSession();
  if (!session?.user?.id || !session.user.role) {
    redirect("/auth/signin");
  }
  if (session.user.role === "STUDENT") {
    redirect("/");
  }

  const { id } = await params;
  const chapter = await getChapterManageData({
    id,
    userId: session.user.id,
    role: session.user.role,
  });

  if (!chapter) {
    notFound();
  }

  return <ChapterManageClient chapter={chapter} />;
}
