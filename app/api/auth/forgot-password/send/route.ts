import { NextResponse } from "next/server";
import { AUTH_RATE_LIMITS, enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { connectToDatabase } from "@/lib/mongodb";
import { issueOtp } from "@/lib/otp";
import User from "@/models/User";
import { sendForgotPasswordEmail } from "@/lib/sendEmails/sendForgotPasswordEmail";

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    await connectToDatabase();

    const limit = await enforceAuthRateLimit({
      action: "forgot-password-send",
      request: req,
      email,
      ...AUTH_RATE_LIMITS.otpSend,
    });
    if (!limit.ok) return limit.response;

    // Deliberately uniform response whether or not the account exists —
    // returning 404 for unknown emails turns this endpoint into a free
    // membership oracle for the entire user base.
    const genericResponse = NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, a verification code has been sent.",
    });

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return genericResponse;
    }

    const code = await issueOtp(email);

    // Dispatch via Resend
    const sent = await sendForgotPasswordEmail(email, code, existingUser.name || "User");

    if (!sent.success) {
      return NextResponse.json(
        { error: "Failed to send reset email. Try again later." },
        { status: 500 }
      );
    }

    return genericResponse;
  } catch (error) {
    console.error("[POST /api/auth/forgot-password/send]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
