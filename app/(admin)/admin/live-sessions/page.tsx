import { redirect } from "next/navigation";
import Link from "next/link";

import { getSafeServerSession } from "@/lib/auth";
import { AdminLiveSessionsClient } from "./admin-live-sessions-client";
import { connectToDatabase } from "@/lib/mongodb";
import LiveSession from "@/models/LiveSession";
import Course from "@/models/Course";
import CourseNotificationLog from "@/models/CourseNotificationLog";

export default async function AdminLiveSessionsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const [sessions, courses, notificationLogs] = await Promise.all([
    LiveSession.find()
      .sort({ scheduledAt: -1 })
      .lean(),
    Course.find().select("_id title slug instructorName").lean(),
    CourseNotificationLog.find().lean(),
  ]);

  const courseById = new Map(
    courses.map((c) => [c._id.toString(), c]),
  );

  const notificationCountBySession = new Map<string, { sent: number; failed: number }>();
  notificationLogs.forEach((log) => {
    const key = log.liveSessionId.toString();
    const existing = notificationCountBySession.get(key) ?? { sent: 0, failed: 0 };
    if (log.status === "SENT") existing.sent++;
    else if (log.status === "FAILED") existing.failed++;
    notificationCountBySession.set(key, existing);
  });

  return (
    <AdminLiveSessionsClient
      sessions={sessions.map((s) => ({
        _id: s._id.toString(),
        courseId: s.courseId.toString(),
        courseTitle: courseById.get(s.courseId.toString())?.title ?? "Unknown",
        courseSlug: courseById.get(s.courseId.toString())?.slug ?? "",
        instructorName: courseById.get(s.courseId.toString())?.instructorName ?? "Unknown",
        title: s.title,
        scheduledAt: s.scheduledAt.toString(),
        durationMinutes: s.durationMinutes,
        status: s.status,
        zoomLink: s.zoomLink,
        notificationsSent: s.notificationsSent,
        recordingUrl: s.recordingUrl,
        notificationStats: notificationCountBySession.get(s._id.toString()) ?? {
          sent: 0,
          failed: 0,
        },
      }))}
    />
  );
}