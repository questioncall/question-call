type LiveSessionWhatsappRecipient = {
  name?: string | null;
  phone?: string | null;
};

type LiveSessionWhatsappSession = {
  title: string;
  scheduledAt: Date | string;
  zoomLink?: string | null;
};

type LiveSessionWhatsappCourse = {
  title: string;
};

function formatScheduledLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Katmandu",
  }).format(new Date(value));
}

function normalizeWhatsappNumber(phone: string) {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

export async function sendLiveSessionWhatsApp(
  student: LiveSessionWhatsappRecipient,
  session: LiveSessionWhatsappSession,
  course: LiveSessionWhatsappCourse,
) {
  if (!student.phone) {
    return { success: false, error: "NO_PHONE" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "TWILIO_NOT_CONFIGURED" };
  }

  const body = [
    `*${course.title}* — Live Class Alert!`,
    `Hi ${student.name?.split(" ")[0] || "there"},`,
    `Class *${session.title}* starts on *${formatScheduledLabel(session.scheduledAt)}*.`,
    session.zoomLink ? `Join: ${session.zoomLink}` : "Your instructor will share the join link soon.",
  ].join("\n");

  const payload = new URLSearchParams();
  payload.set("To", normalizeWhatsappNumber(student.phone));
  payload.set("From", fromNumber);
  payload.set("Body", body);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || "TWILIO_REQUEST_FAILED",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "TWILIO_REQUEST_FAILED",
    };
  }
}
