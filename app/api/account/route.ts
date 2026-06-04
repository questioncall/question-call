import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  deletionGraceExpiresAt,
} from "@/lib/account-deletion";
import User from "@/models/User";
import RefreshTokenModel from "@/models/RefreshToken";
import AccountDeletion from "@/models/AccountDeletion";

export const dynamic = "force-dynamic";

type DeleteAccountBody = {
  /** Must equal "DELETE" so the action is explicit and not accidental. */
  confirm?: string;
  /** Required only for accounts that have a password (email sign-up). */
  password?: string;
  /** Optional free-text / preset reason the user gave for leaving. */
  reason?: string;
};

/**
 * DELETE /api/account
 *
 * Self-service account deletion (Google Play / App Store requirement).
 * Works for both mobile (Bearer token) and web (session cookie).
 *
 * This is a *soft* delete: the account is marked deleted and immediately blocked
 * from every auth gate, but its data is preserved for a 30-day recovery window
 * (see lib/account-deletion). The user can recover it within that window by
 * resetting their password via the "Forgot Password" OTP flow. After the window
 * a cron job permanently anonymizes the record.
 */
export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: DeleteAccountBody = {};
    try {
      body = (await request.json()) as DeleteAccountBody;
    } catch {
      // Empty body is allowed for password-less (Google) accounts.
    }

    if (body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Send { "confirm": "DELETE" } to confirm account deletion.' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await User.findById(authUser.id).select("+passwordHash");

    if (!user || user.isDeleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If the account has a password, require it so a stolen short-lived access
    // token can't be used to delete the account. Google/SSO-only accounts have
    // no passwordHash and rely on the already-verified session/token.
    if (user.passwordHash) {
      if (!body.password) {
        return NextResponse.json(
          { error: "Password is required to delete this account." },
          { status: 400 },
        );
      }

      const passwordMatches = await bcrypt.compare(
        body.password,
        user.passwordHash,
      );

      if (!passwordMatches) {
        return NextResponse.json(
          { error: "Incorrect password." },
          { status: 401 },
        );
      }
    }

    const reason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

    const now = new Date();

    // Soft delete — keep the data so the account can be recovered in time.
    await User.updateOne(
      { _id: user._id },
      { $set: { isDeleted: true, deletedAt: now } },
    );

    // Revoke every active refresh token so existing sessions die immediately.
    await RefreshTokenModel.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: now } },
    );

    // Audit row for the admin "Account Deletions" log. Snapshot identity now,
    // before the eventual anonymization wipes it from the User record.
    await AccountDeletion.create({
      userId: user._id,
      name: user.name ?? "",
      email: user.email ?? "",
      role: user.role ?? "",
      reason,
      deletedAt: now,
      status: "pending",
    });

    return NextResponse.json(
      {
        success: true,
        recoveryDeadline: deletionGraceExpiresAt(now).toISOString(),
        recoveryWindowDays: ACCOUNT_DELETION_GRACE_DAYS,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
