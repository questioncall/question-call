import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { redirect } from "next/navigation";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseVideo from "@/models/CourseVideo";
import { CourseStudioClient } from "./studio-client";

export const metadata = {
  title: "Course Studio — Question Hub",
  description: "Create and manage your courses",
};

export default async function CourseStudioPage() {
  const session = await getSafeServerSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  if (session.user.role === "STUDENT") {
    redirect("/");
  }

  await connectToDatabase();

  const courseQuery =
    session.user.role === "ADMIN" ? {} : { instructorId: session.user.id };

  const courses = await Course.find(courseQuery).sort({ createdAt: -1 }).lean();
  const courseIds = courses.map((course) => course._id);

  const [enrollmentCounts, videoCounts] = courseIds.length
    ? await Promise.all([
        CourseEnrollment.aggregate([
          { $match: { courseId: { $in: courseIds } } },
          { $group: { _id: "$courseId", count: { $sum: 1 } } },
        ]),
        CourseVideo.aggregate([
          { $match: { courseId: { $in: courseIds } } },
          { $group: { _id: "$courseId", count: { $sum: 1 } } },
        ]),
      ])
    : [[], []];

  const enrollmentCountByCourse = new Map(
    enrollmentCounts.map((entry) => [String(entry._id), entry.count as number]),
  );
  const videoCountByCourse = new Map(
    videoCounts.map((entry) => [String(entry._id), entry.count as number]),
  );

  return (
    <CourseStudioClient
      courses={courses.map((course) => ({
        _id: course._id.toString(),
        slug: course.slug,
        title: course.title,
        description: course.description,
        subject: course.subject,
        level: course.level,
        pricingModel: course.pricingModel,
        price: course.price ?? null,
        status: course.status,
        thumbnailUrl: course.thumbnailUrl ?? null,
        totalDurationMinutes: course.totalDurationMinutes ?? 0,
        enrollmentCount: enrollmentCountByCourse.get(course._id.toString()) ?? 0,
        videoCount: videoCountByCourse.get(course._id.toString()) ?? 0,
        createdAt: course.createdAt.toISOString(),
      }))}
    />
  );
}
