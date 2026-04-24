import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

import {
  CALL_RINGTONE_VALUES,
  DEFAULT_CALL_SETTINGS,
} from "@/lib/call-settings";

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

    // ─── Referral System ──────────────────────────────────────────

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    bonusQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralHistory: [
      {
        referredUserId: { type: Schema.Types.ObjectId, ref: "User" },
        pointsEarned: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
      },
    ],

    // ─── Question Limit Tracking (Phase - Question Packages) ─────────
    /** Current subscription plan slug */
    planSlug: {
      type: String,
      default: "free",
    },
    /** Total questions asked in current subscription period */
    questionsAsked: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ─── Teacher fields (Phase 7: points-based) ─────────────────
    /** Current redeemable point balance (replaces old walletBalance) */
    pointBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Total points earned over time */
    totalPointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Total points withdrawn */
    totalPointsWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Total penalty points deducted (rating 1, timeouts, etc.) */
    totalPenaltyPoints: {
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
    /** Tracks when the teacher last claimed the monthly high-rating bonus */
    monthlyBonusClaimedAt: {
      type: Date,
      default: null,
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
    callSettings: {
      silentIncomingCalls: {
        type: Boolean,
        default: DEFAULT_CALL_SETTINGS.silentIncomingCalls,
      },
      incomingRingtone: {
        type: String,
        enum: CALL_RINGTONE_VALUES,
        default: DEFAULT_CALL_SETTINGS.incomingRingtone,
      },
      outgoingRingtone: {
        type: String,
        enum: CALL_RINGTONE_VALUES,
        default: DEFAULT_CALL_SETTINGS.outgoingRingtone,
      },
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
    seenNotices: [
      {
        type: Schema.Types.ObjectId,
        ref: "Notice",
      },
    ],
    seenOnboardingRoles: {
      type: [String],
      enum: ["STUDENT", "TEACHER", "ADMIN"],
      default: [],
    },
    seenAdminNotifications: {
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
