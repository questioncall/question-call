import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVerificationToken extends Document {
  email: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  verifiedAt: Date | null;
}

const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Delete exactly AT expiresAt. The previous `{ expires: "10m" }` added a
      // further 10 minutes on top of an expiresAt already set to now+10min,
      // doubling the real lifetime of every code.
      //
      // NOTE: Mongo will not alter an existing index in place. If this
      // collection predates the change, drop the old index once:
      //   db.verificationtokens.dropIndex("expiresAt_1")
      // The corrected index is then recreated automatically.
      index: { expires: 0 },
    },
    /** Failed verification attempts; capped in lib/otp.ts to stop brute force. */
    attempts: {
      type: Number,
      default: 0,
    },
    /**
     * Set when the correct code was presented to /verify-email/confirm.
     * Lets older mobile builds — which verify the OTP but don't forward it to
     * /api/auth/register — still complete signup. See lib/otp.ts.
     */
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const VerificationToken: Model<IVerificationToken> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>("VerificationToken", VerificationTokenSchema);

export default VerificationToken;
