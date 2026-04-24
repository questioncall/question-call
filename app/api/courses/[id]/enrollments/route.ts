import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
import User from "@/models/User";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    const course = await Course.findById(id).select("_id instructorId").lean();
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const canManage =
      session.user.role === "ADMIN" ||
      course.instructorId.toString() === session.user.id;

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const enrollments = await CourseEnrollment.find({ courseId: course._id })
      .populate({ path: "studentId", select: "name email username userImage", model: User })
      .sort({ enrolledAt: -1 })
      .lean();

    return NextResponse.json({
      enrollments: enrollments.map((enrollment) => {
        const student = enrollment.studentId as
          | {
              _id?: { toString(): string };
              name?: string;
              email?: string;
              username?: string;
              userImage?: string | null;
            }
          | null;

        return {
          id: enrollment._id.toString(),
          accessType: enrollment.accessType,
          enrolledAt: enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toISOString() : null,
          lastAccessedAt: enrollment.lastAccessedAt
            ? new Date(enrollment.lastAccessedAt).toISOString()
            : null,
          overallProgressPercent: enrollment.overallProgressPercent ?? 0,
          completedVideoCount: enrollment.completedVideoCount ?? 0,
          totalVideoCount: enrollment.totalVideoCount ?? 0,
          student: {
            id: student?._id?.toString() ?? "",
            name: student?.name ?? "Unknown student",
            email: student?.email ?? "",
            username: student?.username ?? "",
            userImage: student?.userImage ?? null,
          },
        };
      }),
    });
  } catch (error) {
    console.error("[GET /api/courses/:id/enrollments]", error);
    return NextResponse.json(
      { error: "Failed to load enrolled users." },
      { status: 500 },
    );
  }
}
