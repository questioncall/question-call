import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["STUDENT", "TEACHER", "ADMIN"],
      required: true,
    },
    isMasterAdmin: {
      type: Boolean,
      default: false,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscriptionStatus: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "EXPIRED"],
      default: "TRIAL",
    },
    subscriptionEnd: {
      type: Date,
      default: null,
    },
    trialUsed: {
      type: Boolean,
      default: false,
    },

    // ─── Teacher fields (Phase 7: points-based) ─────────────────
    /** Current redeemable point balance (replaces old walletBalance) */
    pointBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAnswered: {
      type: Number,
      default: 0,
      min: 0,
    },
    isMonetized: {
      type: Boolean,
      default: false,
    },
    /** eSewa number for withdrawals - saved for teacher convenience */
    esewaNumber: {
      type: String,
      default: null,
      trim: true,
    },
    /** Sum of all ratings received — used to compute average on the fly */
    overallRatingSum: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Count of all ratings received — used to compute average on the fly */
    overallRatingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    /**
     * @deprecated Kept for backward compatibility with existing UI reads.
     * Prefer computing: overallRatingSum / overallRatingCount on the fly.
     */
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalAsked: {
      type: Number,
      default: 0,
      min: 0,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    teacherModeVerified: {
      type: Boolean,
      default: false,
    },
    userImage: {
      type: String,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    skills: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export type UserRecord = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserRecord>;

const User = models.User || model("User", userSchema);

export default User;
