import crypto from "crypto";

import VerificationToken from "@/models/VerificationToken";

/**
 * One-time codes for email verification and password reset.
 *
 * Every OTP check in the app must go through `verifyOtp` so the four controls
 * below stay in force everywhere:
 *
 *   1. Codes come from `crypto.randomInt`, not `Math.random` (which is a
 *      non-cryptographic PRNG and must never generate security tokens).
 *   2. Expiry is enforced in application code. The Mongo TTL reaper is a
 *      cleanup mechanism, not an access control — it runs about once a minute
 *      and is not a guarantee.
 *   3. Attempts are capped, so a 6-digit space cannot be enumerated.
 *   4. Comparison is constant time.
 */

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * How long a token stamped by /verify-email/confirm stays usable as proof of
 * email ownership for a registration that does not forward the code itself.
 * See `consumeVerifiedOtp` — this exists only for backward compatibility.
 *
 * Capped by OTP_TTL_MS in practice, since the token itself expires first; this
 * is the tighter of the two bounds if the TTL is ever raised.
 */
export const OTP_VERIFIED_GRACE_MS = OTP_TTL_MS;

/** Cryptographically secure 6-digit code. */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Issue a fresh code for `email`, replacing any outstanding one and resetting
 * the attempt counter.
 */
export async function issueOtp(email: string): Promise<string> {
  const code = generateOtpCode();

  await VerificationToken.findOneAndUpdate(
    { email },
    {
      email,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      verifiedAt: null,
    },
    { upsert: true, new: true },
  );

  return code;
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, so compare lengths first. Code
  // length is not secret, so this leaks nothing useful.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Validate a submitted code.
 *
 * Failures are deliberately indistinguishable ("Invalid or expired code") so
 * the response cannot be used to probe which emails have a pending token.
 *
 * @param consume - delete the token on success. Pass `true` from the endpoint
 *   that performs the privileged action (reset / register), `false` from a
 *   pure "is this code right?" pre-check, so the code survives for the real
 *   call that follows.
 */
export async function verifyOtp(
  email: string,
  submittedCode: unknown,
  { consume }: { consume: boolean },
): Promise<OtpVerifyResult> {
  const invalid = {
    ok: false as const,
    status: 400,
    error: "Invalid or expired code.",
  };

  if (typeof submittedCode !== "string" || !submittedCode) {
    return invalid;
  }

  const record = await VerificationToken.findOne({ email });
  if (!record) {
    return invalid;
  }

  // Application-level expiry — never rely on the TTL reaper alone.
  if (!record.expiresAt || record.expiresAt.getTime() < Date.now()) {
    await VerificationToken.deleteOne({ _id: record._id });
    return invalid;
  }

  if ((record.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    // Burn the token entirely; the user must request a new one.
    await VerificationToken.deleteOne({ _id: record._id });
    return {
      ok: false,
      status: 429,
      error: "Too many incorrect attempts. Request a new code.",
    };
  }

  if (!constantTimeEquals(submittedCode, record.code)) {
    await VerificationToken.updateOne(
      { _id: record._id },
      { $inc: { attempts: 1 } },
    );
    return invalid;
  }

  if (consume) {
    await VerificationToken.deleteOne({ _id: record._id });
  } else {
    // Record that ownership was proven, so a follow-up request that cannot
    // forward the code (see consumeVerifiedOtp) can still rely on it.
    await VerificationToken.updateOne(
      { _id: record._id },
      { $set: { verifiedAt: new Date() } },
    );
  }

  return { ok: true };
}

/** Delete the outstanding token for `email`, if any. Safe to call twice. */
export async function consumeOtp(email: string): Promise<void> {
  await VerificationToken.deleteOne({ email });
}

/**
 * BACKWARD COMPATIBILITY ONLY.
 *
 * Accepts a token that `/verify-email/confirm` already stamped as verified,
 * for clients that prove ownership in a separate call and do not forward the
 * code to the endpoint performing the privileged action. Mobile builds shipped
 * before the register-endpoint change behave this way.
 *
 * This is safe because `verifiedAt` can only be set by presenting the correct
 * code to a rate-limited, attempt-capped endpoint — an attacker who never had
 * the OTP cannot reach this state. It is nonetheless strictly weaker than
 * passing the code, since it widens the window from a single call to
 * OTP_VERIFIED_GRACE_MS.
 *
 * REMOVE once no pre-change clients remain in the wild.
 */
export async function consumeVerifiedOtp(
  email: string,
): Promise<OtpVerifyResult> {
  const record = await VerificationToken.findOne({ email });

  if (!record?.verifiedAt) {
    return {
      ok: false,
      status: 400,
      error: "Email verification code is required.",
    };
  }

  // Enforce BOTH bounds in application code, same as verifyOtp: the token's own
  // expiry, and how long a verification stays usable. The TTL reaper lags by up
  // to a minute and is cleanup, not access control.
  const expired =
    !record.expiresAt ||
    record.expiresAt.getTime() < Date.now() ||
    Date.now() - record.verifiedAt.getTime() > OTP_VERIFIED_GRACE_MS;

  if (expired) {
    await VerificationToken.deleteOne({ _id: record._id });
    return {
      ok: false,
      status: 400,
      error: "Your email verification expired. Please request a new code.",
    };
  }

  return { ok: true };
}
