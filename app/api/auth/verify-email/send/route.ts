import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import VerificationToken from "@/models/VerificationToken";
import User from "@/models/User";
import { sendVerificationEmail } from "@/lib/sendEmails/sendVerificationEmail";

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    await connectToDatabase();

    // Ensure email isn't already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Account with this email already exists." },
        { status: 409 }
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
