import { sendLiveSessionInviteEmail } from "@/lib/sendEmails/sendLiveSessionInviteEmail";

type LiveSessionEmailRecipient = {
  email?: string | null;
  name?: string | null;
};

type LiveSessionEmailSession = {
  title: string;
  scheduledAt: Date | string;
  durationMinutes?: number | null;
  zoomLink?: string | null;
};

type LiveSessionEmailCourse = {
  title: string;
  instructorName: string;
};

function formatScheduledLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Katmandu",
  }).format(new Date(value));
}

function formatDurationLabel(durationMinutes?: number | null) {
  if (!durationMinutes || durationMinutes <= 0) {
    return "Duration will be confirmed by the instructor";
  }

  return `${durationMinutes} minutes`;
}

export async function sendLiveSessionEmail(
  student: LiveSessionEmailRecipient,
  session: LiveSessionEmailSession,
  course: LiveSessionEmailCourse,
) {
  if (!student.email) {
    return { success: false, error: "NO_EMAIL" };
  }

  const result = await sendLiveSessionInviteEmail({
    email: student.email,
    studentName: student.name || "Student",
    courseTitle: course.title,
    sessionTitle: session.title,
    instructorName: course.instructorName,
    scheduledLabel: formatScheduledLabel(session.scheduledAt),
    durationLabel: formatDurationLabel(session.durationMinutes),
    zoomLink: session.zoomLink,
  });

  return {
    success: result.success,
    error: result.error || undefined,
  };
}
