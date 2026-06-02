import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseSection from "@/models/CourseSection";
import CourseVideo from "@/models/CourseVideo";
import User from "@/models/User";

async function getCourseAndUser(userId: string, courseId: string) {
  await connectToDatabase();

  const [course, user] = await Promise.all([
    Course.findById(courseId).select("instructorId").lean(),
    User.findById(userId).select("role").lean<{ role?: string } | null>(),
  ]);

  return { course, user };
}

export async function checkCourseAccess(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { course, user } = await getCourseAndUser(userId, courseId);

  if (!course || !user?.role) {
    return false;
  }

  if (user.role === "ADMIN") {
    return true;
  }

  if (course.instructorId.toString() === userId) {
    return true;
  }

  const enrollmentExists = await CourseEnrollment.exists({
    courseId,
    studentId: userId,
  });

  return Boolean(enrollmentExists);
}

export async function checkCourseManagementAccess(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { course, user } = await getCourseAndUser(userId, courseId);

  if (!course || !user?.role) {
    return false;
  }

  return user.role === "ADMIN" || course.instructorId.toString() === userId;
}

/**
 * Ids of the first N videos in curriculum order (section order, then video
 * order within section) that the course exposes as free preview. Non-enrolled
 * users may watch these without buying/subscribing. Returns an empty set when
 * the course has no free preview configured.
 */
export async function getCourseFreePreviewVideoIds(
  courseId: string,
): Promise<Set<string>> {
  await connectToDatabase();

  const course = await Course.findById(courseId)
    .select("freePreviewCount")
    .lean<{ freePreviewCount?: number } | null>();

  const count = course?.freePreviewCount ?? 0;
  if (!count || count <= 0) {
    return new Set();
  }

  const [sections, videos] = await Promise.all([
    CourseSection.find({ courseId }).select("_id order").sort({ order: 1 }).lean(),
    CourseVideo.find({ courseId }).select("_id sectionId order").lean(),
  ]);

  const sectionOrder = new Map(
    sections.map((section, index) => [
      section._id.toString(),
      section.order ?? index + 1,
    ]),
  );

  const ordered = [...videos].sort((a, b) => {
    const sa = sectionOrder.get(a.sectionId.toString()) ?? Number.MAX_SAFE_INTEGER;
    const sb = sectionOrder.get(b.sectionId.toString()) ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  return new Set(ordered.slice(0, count).map((video) => video._id.toString()));
}
