import { connectToDatabase } from "@/lib/mongodb";
import { DEFAULT_CALL_SETTINGS } from "@/lib/call-settings";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notification-prefs";
import User from "@/models/User";
import RefreshTokenModel from "@/models/RefreshToken";
import AccountDeletion from "@/models/AccountDeletion";

/**
 * Self-service account deletion is a two-stage process:
 *
 *  1. The user deletes their account → it is *soft-deleted* (isDeleted = true,
 *     deletedAt = now). The record keeps all its data so it can be recovered.
 *     Every auth gate rejects the account, so it behaves as gone.
 *  2. The user can recover the account for ACCOUNT_DELETION_GRACE_DAYS by
 *     running the "Forgot Password" OTP flow with their email — completing a
 *     password reset reactivates it (see app/api/auth/forgot-password/reset).
 *  3. After the grace window a cron job (app/api/cron/purge-deleted-accounts)
 *     permanently anonymizes the record: all PII is stripped and recovery is
 *     no longer possible.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;
export const ACCOUNT_DELETION_GRACE_MS =
  ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

/** The moment a soft-deleted account stops being recoverable. */
export function deletionGraceExpiresAt(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + ACCOUNT_DELETION_GRACE_MS);
}

/** True while a soft-deleted account can still be recovered. */
export function isWithinDeletionGrace(deletedAt?: Date | null): boolean {
  if (!deletedAt) return false;
  return Date.now() < deletionGraceExpiresAt(deletedAt).getTime();
}

/**
 * Permanently strip all personal data from a (soft-deleted) user. Irreversible.
 * The document itself is retained — anonymized — so content the user authored
 * (questions, answers, ratings, transactions) keeps its references intact.
 */
export async function anonymizeDeletedUser(userId: string): Promise<void> {
  await connectToDatabase();

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        name: "Deleted User",
        // Keep the address unique but free the original email for re-use.
        email: `deleted+${userId}@deleted.questioncall.com`,
        passwordHash: null,
        userImage: null,
        bio: "",
        esewaNumber: null,
        skills: [],
        interests: [],
        callSettings: DEFAULT_CALL_SETTINGS,
        notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
        isDeleted: true,
        isSuspended: true,
      },
      // Free the unique sparse fields so they don't block future sign-ups.
      $unset: {
        username: "",
        referralCode: "",
      },
    },
  );

  await RefreshTokenModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/**
 * Anonymize every soft-deleted account whose grace window has elapsed.
 * Idempotent: already-anonymized records (email starts with "deleted+") are
 * skipped. Called by the purge-deleted-accounts cron.
 */
export async function purgeExpiredDeletedAccounts(): Promise<{
  purgedCount: number;
}> {
  await connectToDatabase();

  const cutoff = new Date(Date.now() - ACCOUNT_DELETION_GRACE_MS);

  const expired = await User.find({
    isDeleted: true,
    deletedAt: { $ne: null, $lte: cutoff },
    email: { $not: /^deleted\+/ },
  })
    .select("_id")
    .lean();

  for (const doc of expired) {
    const userId = (doc._id as { toString(): string }).toString();
    await anonymizeDeletedUser(userId);

    // Close out the admin deletion log entry.
    await AccountDeletion.updateMany(
      { userId, status: "pending" },
      { $set: { status: "purged", purgedAt: new Date() } },
    );
  }

  return { purgedCount: expired.length };
}
