import resend from "@/lib/resend/resend";
import { LiveSessionInviteEmail } from "@/emails/LiveSessionInviteEmail";

type SendLiveSessionInviteEmailInput = {
  email: string;
  studentName: string;
  courseTitle: string;
  sessionTitle: string;
  instructorName: string;
  scheduledLabel: string;
  durationLabel: string;
  zoomLink?: string | null;
};

export async function sendLiveSessionInviteEmail({
  email,
  studentName,
  courseTitle,
  sessionTitle,
  instructorName,
  scheduledLabel,
  durationLabel,
  zoomLink,
}: SendLiveSessionInviteEmailInput) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME || "Question Hub"} <no-reply@siddhantyadav.com.np>`,
      to: email,
      subject: `Live Class: ${sessionTitle} — ${scheduledLabel}`,
      react: LiveSessionInviteEmail({
        studentName,
        courseTitle,
        sessionTitle,
        instructorName,
        scheduledLabel,
        durationLabel,
        zoomLink,
      }),
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to send live session invite email.",
        data: null,
      };
    }

    return {
      success: true,
      error: null,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send live session invite email.",
      data: null,
    };
  }
}
