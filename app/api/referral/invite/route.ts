import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { sendReferralInviteEmail } from "@/lib/sendEmails/sendReferralInviteEmail";
import Notification from "@/models/Notification";
import { emitNotification } from "@/lib/pusher/pusherServer";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { emails, message, referralLink, referrerName } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "At least one valid email is required" },
        { status: 400 }
      );
    }

    if (emails.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 emails allowed per invitation" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select("name email");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    for (const email of emails) {
      const trimmed = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (emailRegex.test(trimmed)) {
        if (trimmed !== user.email) {
          validEmails.push(trimmed);
        } else {
          invalidEmails.push("You cannot invite yourself");
        }
      } else {
        invalidEmails.push(`Invalid email: ${email}`);
      }
    }

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: invalidEmails.join(", ") || "No valid emails to send" },
        { status: 400 }
      );
    }

    let successCount = 0;
    let failedEmails: string[] = [];

    for (const email of validEmails) {
      const result = await sendReferralInviteEmail({
        email,
        referrerName: user.name,
        referralLink,
        message,
      });

      if (result.success) {
        successCount++;
      } else {
        failedEmails.push(`${email}: ${result.error}`);
      }
    }

    if (successCount > 0) {
      const notification = await Notification.create({
        userId: user._id,
        type: "PAYMENT",
        message: `You invited ${successCount} friend${successCount > 1 ? "s" : ""}! When they join, you'll both get bonus questions.`,
        isRead: false,
      }).catch(() => null);

      if (notification) {
        await emitNotification(user._id.toString(), notification).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedEmails.length > 0 ? failedEmails : undefined,
      message: successCount > 0 
        ? `Successfully sent ${successCount} invitation${successCount > 1 ? "s" : ""}!`
        : "Failed to send any invitations",
    });
  } catch (error) {
    console.error("[POST /api/referral/invite]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}