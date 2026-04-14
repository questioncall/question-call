import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { checkCourseManagementAccess } from "@/lib/course-access";
import { connectToDatabase } from "@/lib/mongodb";
import { sendLiveSessionEmail } from "@/lib/notifications/email";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseNotificationLog from "@/models/CourseNotificationLog";
import LiveSession from "@/models/LiveSession";
import User from "@/models/User";

type EnrollmentRecipient = {
  studentId: {
    _id: Types.ObjectId;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json(
        { error: "Invalid course or live session id." },
        { status: 400 },
      );
    }

    const canManage = await checkCourseManagementAccess(session.user.id, id);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const [course, liveSession, enrollments] = await Promise.all([
      Course.findById(id).select("title instructorName").lean(),
      LiveSession.findOne({ _id: sessionId, courseId: id }),
      CourseEnrollment.find({ courseId: id })
        .populate({
          path: "studentId",
          select: "name email phone",
          model: User,
        })
        .lean<EnrollmentRecipient[]>(),
    ]);

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (!liveSession) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    const results = await Promise.all(
      enrollments.map(async (enrollment) => {
        const recipient = enrollment.studentId;
        if (!recipient?._id) {
          return {
            recipientId: null,
            status: "FAILED" as const,
            channels: ["EMAIL"] as const,
            failureReason: "RECIPIENT_NOT_FOUND",
          };
        }

        const emailResult = await sendLiveSessionEmail(recipient, liveSession, {
          title: course.title,
          instructorName: course.instructorName,
        });

        const delivered = Boolean(emailResult.success);
        const failureReasons = [emailResult.error].filter(Boolean);

        return {
          recipientId: recipient._id,
          status: delivered ? ("SENT" as const) : ("FAILED" as const),
          channels: ["EMAIL"] as const,
          failureReason:
            failureReasons.length > 0 ? failureReasons.join(" | ") : null,
        };
      }),
    );

    const logDocuments = results
      .filter((result) => result.recipientId)
      .map((result) => ({
        liveSessionId: liveSession._id,
        courseId: id,
        recipientId: result.recipientId,
        channels: result.channels,
        status: result.status,
        failureReason: result.failureReason,
      }));

    if (logDocuments.length > 0) {
      await CourseNotificationLog.insertMany(logDocuments, { ordered: false }).catch(
        (error) => {
          console.error("[CourseNotificationLog.insertMany]", error);
        },
      );
    }

    liveSession.notificationsSent = true;
    liveSession.notificationSentAt = new Date();
    liveSession.notificationChannels = ["EMAIL"];
    await liveSession.save();

    const sent = results.filter((result) => result.status === "SENT").length;
    const failed = results.filter((result) => result.status === "FAILED").length;

    return NextResponse.json({
      sent,
      failed,
      total: results.length,
    });
  } catch (error) {
    console.error("[POST /api/courses/:id/live-sessions/:sessionId/notify]", error);
    return NextResponse.json(
      { error: "Failed to send live session notifications." },
      { status: 500 },
    );
  }
}
