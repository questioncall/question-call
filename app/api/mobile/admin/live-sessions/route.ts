import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import LiveSession from "@/models/LiveSession";
import Course from "@/models/Course";
import CourseNotificationLog from "@/models/CourseNotificationLog";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/live-sessions
 *
 * Mobile mirror of the web Live Sessions monitor — read-only. Each session is
 * joined with its course (title/slug/instructor) and its push notification
 * sent/failed tallies. The web page's only "action" is a deep-link to the
 * course manage screen, so there are no mutation endpoints here.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const [sessions, courses, notificationLogs] = await Promise.all([
      LiveSession.find().sort({ scheduledAt: -1 }).lean(),
      Course.find().select("_id title slug instructorName").lean(),
      CourseNotificationLog.find().lean(),
    ]);

    const courseById = new Map(courses.map((c) => [c._id.toString(), c]));

    const notificationCountBySession = new Map<string, { sent: number; failed: number }>();
    notificationLogs.forEach((log) => {
      const key = log.liveSessionId.toString();
      const existing = notificationCountBySession.get(key) ?? { sent: 0, failed: 0 };
      if (log.status === "SENT") existing.sent++;
      else if (log.status === "FAILED") existing.failed++;
      notificationCountBySession.set(key, existing);
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        _id: s._id.toString(),
        courseId: s.courseId.toString(),
        courseTitle: courseById.get(s.courseId.toString())?.title ?? "Unknown",
        courseSlug: courseById.get(s.courseId.toString())?.slug ?? "",
        instructorName: courseById.get(s.courseId.toString())?.instructorName ?? "Unknown",
        title: s.title,
        scheduledAt: s.scheduledAt.toISOString(),
        durationMinutes: s.durationMinutes,
        status: s.status,
        zoomLink: s.zoomLink,
        notificationsSent: s.notificationsSent,
        recordingUrl: s.recordingUrl,
        notificationStats: notificationCountBySession.get(s._id.toString()) ?? {
          sent: 0,
          failed: 0,
        },
      })),
    });
  } catch (error) {
    console.error("GET /api/mobile/admin/live-sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
