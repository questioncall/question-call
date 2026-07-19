import { NextResponse } from "next/server";
import { AUTH_RATE_LIMITS, enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, code } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    await connectToDatabase();

    const limit = await enforceAuthRateLimit({
      action: "verify-email-confirm",
      request: req,
      email,
      ...AUTH_RATE_LIMITS.otpVerify,
    });
    if (!limit.ok) return limit.response;

    // Pre-check only — /api/auth/register re-verifies and consumes the code, so
    // registration cannot be reached by skipping this endpoint.
    const result = await verifyOtp(email, code, { consume: false });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: "Code verified." });
  } catch (error) {
    console.error("[POST /api/auth/verify-email/confirm]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
