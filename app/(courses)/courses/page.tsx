import { getSafeServerSession } from "@/lib/auth";
import { getCourseBrowsePageData } from "@/lib/course-page-data";
import { CoursesBrowseClient } from "./courses-browse";

export const metadata = {
  title: "Courses — Question Call",
  description:
    "Browse free, subscription-included, and paid courses. Learn from structured lessons, recordings, and live classes.",
};

export default async function CoursesPage() {
  const session = await getSafeServerSession();
  const data = await getCourseBrowsePageData({
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
  });

  return (
    <CoursesBrowseClient
      courses={data.courses}
      featuredCourses={data.featuredCourses}
      enrolledCourses={data.enrolledCourses}
      managedCourses={data.managedCourses}
      subjects={data.subjects}
      levels={data.levels}
      stats={data.stats}
      isAuthenticated={Boolean(session?.user?.id)}
      userRole={session?.user?.role ?? null}
    />
  );
}
