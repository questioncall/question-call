import { getSafeServerSession } from "@/lib/auth";
import { getChapterDetailData } from "@/lib/chapter-page-data";
import { createPageMetadata } from "@/lib/seo";
import { ChapterDetailClient } from "./chapter-detail-client";

export const metadata = createPageMetadata({
  title: "Chapter",
  description: "Standalone chapter with videos and documents.",
  path: "/chapters",
});

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSafeServerSession();
  const { slug } = await params;
  const chapter = await getChapterDetailData({
    slug,
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
  });

  return (
    <ChapterDetailClient
      chapter={chapter}
      isAuthenticated={Boolean(session?.user?.id)}
      userRole={session?.user?.role ?? null}
    />
  );
}
