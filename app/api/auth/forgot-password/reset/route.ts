import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { AUTH_RATE_LIMITS, enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { connectToDatabase } from "@/lib/mongodb";
import { isWithinDeletionGrace } from "@/lib/account-deletion";
import { consumeOtp, verifyOtp } from "@/lib/otp";
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

    const limit = await enforceAuthRateLimit({
      action: "forgot-password-reset",
      request: req,
      email,
      ...AUTH_RATE_LIMITS.otpVerify,
    });
    if (!limit.ok) return limit.response;

    // Verified but NOT consumed yet: if the password write below fails, the
    // code must survive so the user can retry instead of requesting a new one.
    // It is consumed once the new password is persisted.
    const otp = await verifyOtp(email, code, { consume: false });

    if (!otp.ok) {
      return NextResponse.json({ error: otp.error }, { status: otp.status });
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

    // Password is persisted — burn the code so it cannot be replayed.
    await consumeOtp(email);

    return NextResponse.json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password/reset]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
