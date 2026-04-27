import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import VerificationToken from "@/models/VerificationToken";
import User from "@/models/User";
import { sendForgotPasswordEmail } from "@/lib/sendEmails/sendForgotPasswordEmail";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    await connectToDatabase();

    // Ensure email exists in our system
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      // Return 200 even if user not found to prevent email enumeration, 
      // but for this flow it's sometimes better to return an error if we want to show it in UI.
      // The requirement says "check if that gmail exist in the db or not if yes then we will send a otp"
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Upsert the token for this email (invalidating old ones)
    await VerificationToken.findOneAndUpdate(
      { email },
      { email, code, expiresAt },
      { upsert: true, new: true }
    );

    // Dispatch via Resend
    const sent = await sendForgotPasswordEmail(email, code, existingUser.name || "User");

    if (!sent.success) {
      return NextResponse.json(
        { error: "Failed to send reset email. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Verification code sent." });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password/send]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
