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
  REFERRAL,
} from "@/lib/config";
import { connectToDatabase } from "@/lib/mongodb";
import { getPrimaryAnswerFormat } from "@/lib/question-types";
import {
  DEFAULT_PLATFORM_SOCIAL_HANDLES,
  getDefaultPlatformSocialLinks,
  normalizePlatformSocialLinks,
  CONTACT_SERVICE_EMAIL,
  MAX_CUSTOMER_SERVICE_CONTACTS,
  type PlatformSocialLink,
  type SocialHandleKey,
} from "@/lib/constants";

const DEFAULT_CUSTOMER_SERVICE_EMAILS = [CONTACT_SERVICE_EMAIL];

function getFallbackCustomerServicePhoneNumbers(
  config: Partial<PlatformConfigRecord> | null | undefined,
) {
  const fallbackPhoneNumber = config?.manualPaymentEsewaNumber?.trim();

  return fallbackPhoneNumber ? [fallbackPhoneNumber] : [];
}

function collectCustomerServiceEntries(
  rawEntries: unknown,
  options?: { lowercase?: boolean },
) {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  const normalizedEntries: string[] = [];
  const seenEntries = new Set<string>();

  for (const rawEntry of rawEntries) {
    if (typeof rawEntry !== "string") {
      continue;
    }

    const trimmedEntry = rawEntry.trim();
    const normalizedEntry = options?.lowercase
      ? trimmedEntry.toLowerCase()
      : trimmedEntry;

    if (!normalizedEntry) {
      continue;
    }

    if (seenEntries.has(normalizedEntry)) {
      continue;
    }

    seenEntries.add(normalizedEntry);
    normalizedEntries.push(normalizedEntry);

    if (normalizedEntries.length >= MAX_CUSTOMER_SERVICE_CONTACTS) {
      break;
    }
  }

  return normalizedEntries;
}

function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function normalizeCustomerServiceEntries(
  rawEntries: unknown,
  options?: { fallback?: string[]; lowercase?: boolean },
) {
  const normalizedEntries = collectCustomerServiceEntries(rawEntries, options);

  if (normalizedEntries.length > 0) {
    return normalizedEntries;
  }

  return options?.fallback
    ? collectCustomerServiceEntries(options.fallback, options)
    : [];
}

const platformConfigSchema = new Schema(
  {
    // Format time limits in minutes (default 15 for all)
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

// Referral System
    referralBonusQuestions: {
      type: Number,
      default: REFERRAL.REFEREE_BONUS_QUESTIONS,
      min: 0,
    },
    referrerBonusQuestions: {
      type: Number,
      default: REFERRAL.REFERER_BONUS_QUESTIONS,
      min: 0,
    },
    referralEnabled: {
      type: Boolean,
      default: REFERRAL.ENABLED,
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
    socialFacebookHandle: {
      type: String,
      default: DEFAULT_PLATFORM_SOCIAL_HANDLES.facebook,
      trim: true,
    },
    socialInstagramHandle: {
      type: String,
      default: DEFAULT_PLATFORM_SOCIAL_HANDLES.instagram,
      trim: true,
    },
    socialWhatsappHandle: {
      type: String,
      default: DEFAULT_PLATFORM_SOCIAL_HANDLES.whatsapp,
      trim: true,
    },
    socialYoutubeHandle: {
      type: String,
      default: DEFAULT_PLATFORM_SOCIAL_HANDLES.youtube,
      trim: true,
    },
    socialTwitterHandle: {
      type: String,
      default: DEFAULT_PLATFORM_SOCIAL_HANDLES.twitter,
      trim: true,
    },
    socialLinkedinHandle: {
      type: String,
      default: DEFAULT_PLATFORM_SOCIAL_HANDLES.linkedin,
      trim: true,
    },
    socialTelegramHandle: {
      type: String,
      default: DEFAULT_PLATFORM_SOCIAL_HANDLES.telegram,
      trim: true,
    },
    socialLinks: {
      type: [
        new Schema(
          {
            platform: {
              type: String,
              required: true,
              enum: Object.keys(DEFAULT_PLATFORM_SOCIAL_HANDLES),
            },
            url: {
              type: String,
              default: "",
              trim: true,
            },
          },
          { _id: false },
        ),
      ],
      default: getDefaultPlatformSocialLinks,
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
    planGoDays: {
      type: Number,
      default: 30,
      min: 1,
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
    planPlusDays: {
      type: Number,
      default: 60,
      min: 1,
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
    planProDays: {
      type: Number,
      default: 90,
      min: 1,
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
    planMaxDays: {
      type: Number,
      default: 120,
      min: 1,
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
    customerServicePhoneNumbers: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 40,
        },
      ],
      default: [],
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) &&
          value.length <= MAX_CUSTOMER_SERVICE_CONTACTS,
        message: `A maximum of ${MAX_CUSTOMER_SERVICE_CONTACTS} customer service phone numbers is allowed.`,
      },
    },
    customerServiceEmails: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: 120,
        },
      ],
      default: () => [...DEFAULT_CUSTOMER_SERVICE_EMAILS],
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) &&
          value.length <= MAX_CUSTOMER_SERVICE_CONTACTS,
        message: `A maximum of ${MAX_CUSTOMER_SERVICE_CONTACTS} customer service emails is allowed.`,
      },
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
    bonusPointsFor3Star: {
      type: Number,
      default: TEACHER.BONUS_POINTS_3_STAR,
      min: 0,
    },
    bonusPointsFor2Star: {
      type: Number,
      default: TEACHER.BONUS_POINTS_2_STAR,
      min: 0,
    },
    maxQuestionResetCount: {
      type: Number,
      default: TEACHER.MAX_QUESTION_RESET_COUNT,
      min: 1,
    },
    monthlyHighScoreBonusPoints: {
      type: Number,
      default: TEACHER.MONTHLY_HIGH_SCORE_BONUS_POINTS,
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

    const normalizedCustomerServicePhoneNumbers = normalizeCustomerServiceEntries(
      config.customerServicePhoneNumbers,
      {
        fallback: getFallbackCustomerServicePhoneNumbers(config),
      },
    );
    if (
      !areStringArraysEqual(
        config.customerServicePhoneNumbers ?? [],
        normalizedCustomerServicePhoneNumbers,
      )
    ) {
      config.customerServicePhoneNumbers = normalizedCustomerServicePhoneNumbers;
      shouldSave = true;
    }

    const normalizedCustomerServiceEmails = normalizeCustomerServiceEntries(
      config.customerServiceEmails,
      {
        fallback: DEFAULT_CUSTOMER_SERVICE_EMAILS,
        lowercase: true,
      },
    );
    if (
      !areStringArraysEqual(
        config.customerServiceEmails ?? [],
        normalizedCustomerServiceEmails,
      )
    ) {
      config.customerServiceEmails = normalizedCustomerServiceEmails;
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
  switch (getPrimaryAnswerFormat(answerFormat)) {
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
  switch (getPrimaryAnswerFormat(answerFormat)) {
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
        maxQuestions: config.planGoMaxQuestions ?? plan.maxQuestions,
        durationDays: config.planGoDays ?? 30,
      };
    } else if (plan.slug === "plus") {
      return {
        ...plan,
        price: config.planPlusPrice ?? plan.price,
        maxQuestions: config.planPlusMaxQuestions ?? plan.maxQuestions,
        durationDays: config.planPlusDays ?? 60,
      };
    } else if (plan.slug === "pro") {
      return {
        ...plan,
        price: config.planProPrice ?? plan.price,
        maxQuestions: config.planProMaxQuestions ?? plan.maxQuestions,
        durationDays: config.planProDays ?? 90,
      };
    } else if (plan.slug === "max") {
      return {
        ...plan,
        price: config.planMaxPrice ?? plan.price,
        maxQuestions: config.planMaxMaxQuestions ?? plan.maxQuestions,
        durationDays: config.planMaxDays ?? 120,
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

export function getCustomerServiceDetails(
  config: Partial<PlatformConfigRecord> | null | undefined,
) {
  return {
    phoneNumbers: normalizeCustomerServiceEntries(
      config?.customerServicePhoneNumbers,
      {
        fallback: getFallbackCustomerServicePhoneNumbers(config),
      },
    ),
    emails: normalizeCustomerServiceEntries(config?.customerServiceEmails, {
      fallback: DEFAULT_CUSTOMER_SERVICE_EMAILS,
      lowercase: true,
    }),
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

export type PlatformSocialHandles = Record<SocialHandleKey, string>;
export type PlatformSocialLinks = PlatformSocialLink[];

export function getPlatformSocialLinks(
  config: Partial<PlatformConfigRecord> | null | undefined,
): PlatformSocialLinks {
  if (config && "socialLinks" in config && Array.isArray(config.socialLinks)) {
    return normalizePlatformSocialLinks(config.socialLinks);
  }

  return normalizePlatformSocialLinks(
    [
      {
        platform: "facebook",
        url: config?.socialFacebookHandle?.trim() || DEFAULT_PLATFORM_SOCIAL_HANDLES.facebook,
      },
      {
        platform: "instagram",
        url:
          config?.socialInstagramHandle?.trim() || DEFAULT_PLATFORM_SOCIAL_HANDLES.instagram,
      },
      {
        platform: "whatsapp",
        url: config?.socialWhatsappHandle?.trim() || DEFAULT_PLATFORM_SOCIAL_HANDLES.whatsapp,
      },
      {
        platform: "youtube",
        url: config?.socialYoutubeHandle?.trim() || DEFAULT_PLATFORM_SOCIAL_HANDLES.youtube,
      },
      {
        platform: "twitter",
        url: config?.socialTwitterHandle?.trim() || DEFAULT_PLATFORM_SOCIAL_HANDLES.twitter,
      },
      {
        platform: "linkedin",
        url: config?.socialLinkedinHandle?.trim() || DEFAULT_PLATFORM_SOCIAL_HANDLES.linkedin,
      },
      {
        platform: "telegram",
        url: config?.socialTelegramHandle?.trim() || DEFAULT_PLATFORM_SOCIAL_HANDLES.telegram,
      },
      {
        platform: "tiktok",
        url: DEFAULT_PLATFORM_SOCIAL_HANDLES.tiktok,
      },
      {
        platform: "discord",
        url: DEFAULT_PLATFORM_SOCIAL_HANDLES.discord,
      },
      {
        platform: "website",
        url: DEFAULT_PLATFORM_SOCIAL_HANDLES.website,
      },
    ],
    { fallbackToDefault: true },
  );
}

export function getPlatformSocialHandles(
  config: Partial<PlatformConfigRecord> | null | undefined,
): PlatformSocialHandles {
  const normalizedLinks = getPlatformSocialLinks(config);

  return Object.fromEntries(
    Object.keys(DEFAULT_PLATFORM_SOCIAL_HANDLES).map((platform) => [
      platform,
      normalizedLinks.find((link) => link.platform === platform)?.url ??
        DEFAULT_PLATFORM_SOCIAL_HANDLES[platform as SocialHandleKey],
    ]),
  ) as PlatformSocialHandles;
}

export default PlatformConfig;
