import { NextResponse } from "next/server";
import { AUTH_RATE_LIMITS, enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { connectToDatabase } from "@/lib/mongodb";
import { issueOtp } from "@/lib/otp";
import User from "@/models/User";
import { sendVerificationEmail } from "@/lib/sendEmails/sendVerificationEmail";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, name } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    await connectToDatabase();

    const limit = await enforceAuthRateLimit({
      action: "verify-email-send",
      request: req,
      email,
      ...AUTH_RATE_LIMITS.otpSend,
    });
    if (!limit.ok) return limit.response;

    // Ensure email isn't already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Account with this email already exists." },
        { status: 409 }
      );
    }

    const code = await issueOtp(email);

    // Dispatch via Resend
    const sent = await sendVerificationEmail(email, code, name || "User");

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send verification email. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Verification code sent." });
  } catch (error) {
    console.error("[POST /api/auth/verify-email/send]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
