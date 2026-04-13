import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
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
