import { NextRequest, NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/sendEmails/sendAlertEmail";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !to.length || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await sendAlertEmail({
      to,
      subject,
      body: message,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending alert email:", error);
    return NextResponse.json(
      { error: "Failed to send alert" },
      { status: 500 }
    );
  }
}