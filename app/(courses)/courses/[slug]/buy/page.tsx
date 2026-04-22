import { getSafeServerSession } from "@/lib/auth";
import { getCourseDetailPageData } from "@/lib/course-page-data";
import { createNoIndexMetadata } from "@/lib/seo";
import { CourseBuyClient } from "./course-buy-client";

export const metadata = createNoIndexMetadata({
  title: "Course Checkout",
  description: "Private course purchase flow.",
});

export default async function CourseBuyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSafeServerSession();
  const course = await getCourseDetailPageData({
    slug,
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
  });

  return (
    <CourseBuyClient
      course={course}
      isAuthenticated={!!session?.user?.id}
    />
  );
}
