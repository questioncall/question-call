import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { isWithinDeletionGrace } from "@/lib/account-deletion";
import VerificationToken from "@/models/VerificationToken";
import User from "@/models/User";
import AccountDeletion from "@/models/AccountDeletion";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, code, newPassword } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

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

    // If the account was deleted, a successful reset recovers it — but only
    // inside the 30-day grace window. Past that, the record has been (or will be)
    // anonymized and can no longer be restored.
    if (user.isDeleted) {
      if (!isWithinDeletionGrace(user.deletedAt)) {
        return NextResponse.json(
          {
            error:
              "This account has been permanently deleted and can no longer be recovered.",
          },
          { status: 410 },
        );
      }

      user.isDeleted = false;
      user.deletedAt = null;
      user.isSuspended = false;

      // Reflect the recovery in the admin deletion log.
      await AccountDeletion.updateMany(
        { userId: user._id, status: "pending" },
        { $set: { status: "recovered", recoveredAt: new Date() } },
      );
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
