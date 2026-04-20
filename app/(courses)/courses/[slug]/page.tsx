import { getSafeServerSession } from "@/lib/auth";
import { getCourseDetailPageData } from "@/lib/course-page-data";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import { CourseDetailClient } from "./course-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectToDatabase();

  const course = await Course.findOne({ slug })
    .select("title description")
    .lean<{ title?: string; description?: string } | null>();

  return {
    title: `${course?.title ?? slug.replace(/-/g, " ")} — Question Call`,
    description:
      course?.description ?? "View course details, syllabus, and enroll.",
  };
}

export default async function CourseDetailPage({
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
    <CourseDetailClient
      course={course}
      isAuthenticated={Boolean(session?.user?.id)}
      userRole={session?.user?.role ?? null}
    />
  );
}
