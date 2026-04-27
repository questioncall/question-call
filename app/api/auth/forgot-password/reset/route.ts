import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import VerificationToken from "@/models/VerificationToken";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Email, code, and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    await connectToDatabase();

    const record = await VerificationToken.findOne({ email });

    if (!record) {
      return NextResponse.json({ error: "No pending password reset found or code expired." }, { status: 404 });
    }

    if (record.code !== code) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    user.passwordHash = passwordHash;
    await user.save();

    // Clean up used OTP
    await VerificationToken.deleteOne({ email });

    return NextResponse.json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password/reset]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
