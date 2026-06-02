import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { redirect } from "next/navigation";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseVideo from "@/models/CourseVideo";
import Chapter from "@/models/Chapter";
import ChapterContent from "@/models/ChapterContent";
import ChapterEnrollment from "@/models/ChapterEnrollment";
import { createNoIndexMetadata } from "@/lib/seo";
import { CourseStudioClient } from "./studio-client";

export const metadata = createNoIndexMetadata({
  title: "Course Studio",
  description: "Create and manage your courses.",
});

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
  const chapters = await Chapter.find(courseQuery).sort({ createdAt: -1 }).lean();
  const courseIds = courses.map((course) => course._id);
  const chapterIds = chapters.map((chapter) => chapter._id);

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

  const [chapterEnrollmentCounts, chapterContentCounts] = chapterIds.length
    ? await Promise.all([
        ChapterEnrollment.aggregate([
          { $match: { chapterId: { $in: chapterIds } } },
          { $group: { _id: "$chapterId", count: { $sum: 1 } } },
        ]),
        ChapterContent.aggregate([
          { $match: { chapterId: { $in: chapterIds } } },
          { $group: { _id: "$chapterId", count: { $sum: 1 } } },
        ]),
      ])
    : [[], []];

  const enrollmentCountByChapter = new Map(
    chapterEnrollmentCounts.map((entry) => [String(entry._id), entry.count as number]),
  );
  const contentCountByChapter = new Map(
    chapterContentCounts.map((entry) => [String(entry._id), entry.count as number]),
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
      chapters={chapters.map((chapter) => ({
        _id: chapter._id.toString(),
        slug: chapter.slug,
        title: chapter.title,
        description: chapter.description,
        subject: chapter.subject,
        level: chapter.level,
        pricingModel: chapter.pricingModel,
        price: chapter.price ?? null,
        status: chapter.status,
        thumbnailUrl: chapter.thumbnailUrl ?? null,
        totalDurationMinutes: chapter.totalDurationMinutes ?? 0,
        enrollmentCount: enrollmentCountByChapter.get(chapter._id.toString()) ?? 0,
        contentCount: contentCountByChapter.get(chapter._id.toString()) ?? 0,
        createdAt: chapter.createdAt.toISOString(),
      }))}
      userRole={session.user.role}
    />
  );
}
