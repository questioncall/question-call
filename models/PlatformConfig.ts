/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║               PlatformConfig — Initial Seed Data                ║
 * ║                                                                  ║
 * ║  The default values in this schema are the INITIAL SEED DATA     ║
 * ║  used ONLY when the PlatformConfig collection is empty (first    ║
 * ║  boot / fresh DB). After that, the entire app reads and writes   ║
 * ║  values through the DB-cached getPlatformConfig() function.      ║
 * ║                                                                  ║
 * ║  To change live values, use the Admin Panel — NOT this file.     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";
import {
  FORMAT,
  TEACHER,
  TRIAL,
  SUBSCRIPTION_PLANS,
  WITHDRAWAL,
  PEER_COMMENTS,
  LEGAL,
  QUIZ,
  PLATFORM,
  COURSE,
} from "@/lib/config";
import { connectToDatabase } from "@/lib/mongodb";

const platformConfigSchema = new Schema(
  {
    // Format time limits in minutes
    textFormatDuration: {
      type: Number,
      default: FORMAT.TEXT.DURATION_MINUTES,
      min: 1,
    },
    photoFormatDuration: {
      type: Number,
      default: FORMAT.PHOTO.DURATION_MINUTES,
      min: 1,
    },
    videoFormatDuration: {
      type: Number,
      default: FORMAT.VIDEO.DURATION_MINUTES,
      min: 1,
    },
    maxVideoDurationMinutes: {
      type: Number,
      default: PLATFORM.MAX_VIDEO_DURATION_MINUTES,
      min: 1,
    },

    // Course platform settings (Phase 15)
    courpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63: {
      type: Number,
      default: COURSE.MAX_VIDEO_DURATION_MINUTES,
      min: 1,
    },
    courseVideoUploadMaxBytes: {
      type: Number,
      default: COURSE.MAX_CLOUDINARY_VIDEO_UPLOAD_BYTES,
      min: 1,
    },
    courseProgressCompletionThreshold: {
      type: Number,
      default: COURSE.PROGRESS_COMPLETION_THRESHOLD,
      min: 0,
      max: 100,
    },
    liveSessionNotificationLeadMinutes: {
      type: Number,
      default: COURSE.LIVE_SESSION_NOTIFICATION_LEAD_MINUTES,
      min: 0,
    },
    coursePurchaseCommissionPercent: {
      type: Number,
      default: COURSE.PURCHASE_COMMISSION_PERCENT,
      min: 0,
      max: 100,
    },

    // Platform settings
    commissionPercent: {
      type: Number,
      default: TEACHER.COMMISSION_PERCENT,
      min: 0,
      max: 100,
    },
    scoreDeductionAmount: {
      type: Number,
      default: TEACHER.TIMEOUT_SCORE_DEDUCTION,
      min: 0,
    },
    qualificationThreshold: {
      type: Number,
      default: TEACHER.QUALIFICATION_THRESHOLD,
      min: 1,
    },
    trialDays: {
      type: Number,
      default: TRIAL.DURATION_DAYS,
      min: 1,
    },
    trialMaxQuestions: {
      type: Number,
      default: TRIAL.MAX_QUESTIONS,
      min: 0,
    },

    // Subscription Plan Pricing
    planGoPrice: {
      type: Number,
      default: 100,
      min: 0,
    },
    planGoMaxQuestions: {
      type: Number,
      default: 20,
      min: 0,
    },
    planPlusPrice: {
      type: Number,
      default: 250,
      min: 0,
    },
    planPlusMaxQuestions: {
      type: Number,
      default: 50,
      min: 0,
    },
    planProPrice: {
      type: Number,
      default: 500,
      min: 0,
    },
    planProMaxQuestions: {
      type: Number,
      default: 100,
      min: 0,
    },
    planMaxPrice: {
      type: Number,
      default: 1000,
      min: 0,
    },
    planMaxMaxQuestions: {
      type: Number,
      default: 200,
      min: 0,
    },

    // ─── Manual Payment Display Config ───────────────────────────
    manualPaymentRecipientName: {
      type: String,
      default: "Jiban Mijhar",
      trim: true,
    },
    manualPaymentEsewaNumber: {
      type: String,
      default: "9819748466",
      trim: true,
    },
    manualPaymentQrCodeUrl: {
      type: String,
      default: "/QUESTION_HUB_PAYMENT_QR_CODE.jpeg",
      trim: true,
    },

    // ─── Points Earning Config (Phase 7) ──────────────────────────
    pointsPerTextAnswer: {
      type: Number,
      default: FORMAT.TEXT.POINTS,
      min: 0,
    },
    pointsPerPhotoAnswer: {
      type: Number,
      default: FORMAT.PHOTO.POINTS,
      min: 0,
    },
    pointsPerVideoAnswer: {
      type: Number,
      default: FORMAT.VIDEO.POINTS,
      min: 0,
    },
    bonusPointsFor4Star: {
      type: Number,
      default: TEACHER.BONUS_POINTS_4_STAR,
      min: 0,
    },
    bonusPointsFor5Star: {
      type: Number,
      default: TEACHER.BONUS_POINTS_5_STAR,
      min: 0,
    },
    penaltyPointsForLowRating: {
      type: Number,
      default: TEACHER.PENALTY_POINTS_LOW_RATING,
      min: 0,
    },

    // ─── Withdrawal Config (Phase 7) ─────────────────────────────
    pointToNprRate: {
      type: Number,
      default: WITHDRAWAL.POINT_TO_NPR_RATE,
      min: 0,
    },
    minWithdrawalPoints: {
      type: Number,
      default: WITHDRAWAL.MIN_WITHDRAWAL_POINTS,
      min: 1,
    },

    // ─── Peer Comments Config (Phase 8) ──────────────────────────
    peerCommentPointThreshold: {
      type: Number,
      default: PEER_COMMENTS.POINT_THRESHOLD,
      min: 1,
    },
    peerCommentMinPointReward: {
      type: Number,
      default: PEER_COMMENTS.MIN_POINT_REWARD,
      min: 0,
    },
    peerCommentMaxPointReward: {
      type: Number,
      default: PEER_COMMENTS.MAX_POINT_REWARD,
      min: 0,
    },

    // ─── Quiz Service Config (Phase 12) ───────────────────────────
    quizQuestionCount: {
      type: Number,
      default: QUIZ.QUESTION_COUNT,
      min: 1,
    },
    quizTimeLimitSeconds: {
      type: Number,
      default: QUIZ.TIME_LIMIT_SECONDS,
      min: 60,
    },
    quizRepeatResetDays: {
      type: Number,
      default: QUIZ.REPEAT_RESET_DAYS,
      min: 1,
    },
    freeQuizDailySessionLimit: {
      type: Number,
      default: QUIZ.FREE_DAILY_SESSION_LIMIT,
      min: 0,
    },
    freeQuizPassPercent: {
      type: Number,
      default: QUIZ.FREE_PASS_PERCENT,
      min: 0,
      max: 100,
    },
    freeQuizPointReward: {
      type: Number,
      default: QUIZ.FREE_POINT_REWARD,
      min: 0,
    },
    premiumQuizDailySessionLimit: {
      type: Number,
      default: QUIZ.PREMIUM_DAILY_SESSION_LIMIT,
      min: 0,
    },
    premiumQuizPassPercent: {
      type: Number,
      default: QUIZ.PREMIUM_PASS_PERCENT,
      min: 0,
      max: 100,
    },
    premiumQuizPointReward: {
      type: Number,
      default: QUIZ.PREMIUM_POINT_REWARD,
      min: 0,
    },
    quizViolationWarningLimit: {
      type: Number,
      default: QUIZ.VIOLATION_WARNING_LIMIT,
      min: 0,
    },

    // ─── Legal Content (publicly shown, admin editable) ────────────
    termsOfUseContent: {
      type: String,
      default: LEGAL.TERMS_OF_USE,
      trim: true,
    },
    privacyPolicyContent: {
      type: String,
      default: LEGAL.PRIVACY_POLICY,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export type PlatformConfigRecord = InferSchemaType<typeof platformConfigSchema>;
export type PlatformConfigDocument = HydratedDocument<PlatformConfigRecord>;

const PlatformConfig =
  models.PlatformConfig || model("PlatformConfig", platformConfigSchema);

let cachedConfig: PlatformConfigDocument | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes TTL

/**
 * Returns the singleton PlatformConfig document.
 * Creates one with defaults if it doesn't exist.
 * Uses an in-memory cache to prevent latency for subsequent calls.
 */
export async function getPlatformConfig(): Promise<PlatformConfigDocument> {
  await connectToDatabase();
  const now = Date.now();
  if (cachedConfig && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedConfig;
  }

  let config = await PlatformConfig.findOne();

  if (!config) {
    config = await PlatformConfig.create({});
  } else {
    let shouldSave = false;

    if (
      typeof config.courseVideoUploadMaxBytes !== "number" ||
      config.courseVideoUploadMaxBytes <= 0
    ) {
      config.courseVideoUploadMaxBytes = COURSE.MAX_CLOUDINARY_VIDEO_UPLOAD_BYTES;
      shouldSave = true;
    }

    if (shouldSave) {
      await config.save();
    }
  }

  cachedConfig = config as PlatformConfigDocument;
  lastCacheTime = now;
  return cachedConfig;
}

/** 
 * Clears the server's config cache. 
 * Call this whenever config is updated via the Admin panel.
 */
export function clearPlatformConfigCache() {
  cachedConfig = null;
  lastCacheTime = 0;
}

export function getFormatDurationMinutes(
  config: PlatformConfigDocument,
  answerFormat: string,
): number {
  switch (answerFormat) {
    case "TEXT":
      return config.textFormatDuration;
    case "PHOTO":
      return config.photoFormatDuration;
    case "VIDEO":
      return config.videoFormatDuration;
    default:
      // ANY defaults to PHOTO duration
      return config.photoFormatDuration;
  }
}

/**
 * Get base points for an answer format from live config.
 * Always use this instead of hardcoding point values.
 */
export function getFormatPoints(
  config: PlatformConfigDocument,
  answerFormat: string,
): number {
  switch (answerFormat) {
    case "TEXT":
      return config.pointsPerTextAnswer;
    case "PHOTO":
      return config.pointsPerPhotoAnswer;
    case "VIDEO":
      return config.pointsPerVideoAnswer;
    default:
      // ANY defaults to PHOTO points
      return config.pointsPerPhotoAnswer;
  }
}

/**
 * Merges UI subscription configurations with the live database pricing.
 */
export function getHydratedPlans(config: PlatformConfigDocument) {
  return SUBSCRIPTION_PLANS.map((plan) => {
    if (plan.slug === "free") {
      return {
        ...plan,
        maxQuestions: config.trialMaxQuestions ?? TRIAL.MAX_QUESTIONS,
      };
    } else if (plan.slug === "go") {
      return {
        ...plan,
        price: config.planGoPrice ?? plan.price,
      };
    } else if (plan.slug === "plus") {
      return {
        ...plan,
        price: config.planPlusPrice ?? plan.price,
      };
    } else if (plan.slug === "pro") {
      return {
        ...plan,
        price: config.planProPrice ?? plan.price,
      };
    } else if (plan.slug === "max") {
      return {
        ...plan,
        price: config.planMaxPrice ?? plan.price,
      };
    }
    return plan;
  });
}

export function getManualPaymentDetails(config: Partial<PlatformConfigRecord> | null | undefined) {
  return {
    recipientName:
      config?.manualPaymentRecipientName?.trim() || "Jiban Mijhar",
    esewaNumber:
      config?.manualPaymentEsewaNumber?.trim() || "9819748466",
    qrCodeUrl:
      config?.manualPaymentQrCodeUrl?.trim() || "/QUESTION_HUB_PAYMENT_QR_CODE.jpeg",
  };
}

export function getLegalContent(config: Partial<PlatformConfigRecord> | null | undefined) {
  return {
    termsOfUseContent:
      config?.termsOfUseContent?.trim() || LEGAL.TERMS_OF_USE,
    privacyPolicyContent:
      config?.privacyPolicyContent?.trim() || LEGAL.PRIVACY_POLICY,
    updatedAt: config && "updatedAt" in config ? config.updatedAt ?? null : null,
  };
}

export default PlatformConfig;
