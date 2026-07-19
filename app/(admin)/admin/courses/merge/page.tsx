import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseVideo from "@/models/CourseVideo";

import { AdminCourseMergeClient } from "./admin-course-merge-client";

export const metadata = {
  title: "Merge courses",
};

export const dynamic = "force-dynamic";

export default async function AdminCourseMergePage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const [courses, videoCounts] = await Promise.all([
    Course.find({ mergedInto: null, status: { $ne: "ARCHIVED" } })
      .select("_id title slug status instructorId instructorName enrollmentCount")
      .sort({ instructorName: 1, createdAt: -1 })
      .lean(),
    CourseVideo.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ]),
  ]);

  const videoCountByCourse = new Map(
    videoCounts.map((entry) => [String(entry._id), entry.count]),
  );

  return (
    <AdminCourseMergeClient
      courses={courses.map((course) => ({
        _id: course._id.toString(),
        title: course.title,
        slug: course.slug ?? "",
        status: course.status ?? "DRAFT",
        instructorId: course.instructorId?.toString() ?? "",
        instructorName: course.instructorName ?? "Unknown",
        enrollmentCount: course.enrollmentCount ?? 0,
        videoCount: videoCountByCourse.get(course._id.toString()) ?? 0,
      }))}
    />
  );
}
