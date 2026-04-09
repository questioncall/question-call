import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";
import { FORMAT, TEACHER, TRIAL, SUBSCRIPTION_PLANS } from "@/lib/config";
import { connectToDatabase } from "@/lib/mongodb";

const platformConfigSchema = new Schema(
  {
    // Format pricing (in smallest currency unit, e.g. paisa)
    textFormatPrice: {
      type: Number,
      default: FORMAT.TEXT.PRICE,
      min: 0,
    },
    photoFormatPrice: {
      type: Number,
      default: FORMAT.PHOTO.PRICE,
      min: 0,
    },
    videoFormatPrice: {
      type: Number,
      default: FORMAT.VIDEO.PRICE,
      min: 0,
    },

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
    
    // Subscription Plan Pricing
    plan1MonthPrice: {
      type: Number,
      default: SUBSCRIPTION_PLANS.find(p => p.slug === "1month")?.price || 50,
      min: 0,
    },
    plan1MonthOriginalPrice: {
      type: Number,
      default: SUBSCRIPTION_PLANS.find(p => p.slug === "1month")?.originalPrice || 100,
    },
    plan3MonthPrice: {
      type: Number,
      default: SUBSCRIPTION_PLANS.find(p => p.slug === "3month")?.price || 140,
      min: 0,
    },
    plan3MonthOriginalPrice: {
      type: Number,
      default: SUBSCRIPTION_PLANS.find(p => p.slug === "3month")?.originalPrice || 250,
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
 * Merges UI subscription configurations with the live database pricing.
 */
export function getHydratedPlans(config: PlatformConfigDocument) {
  return SUBSCRIPTION_PLANS.map((plan) => {
    if (plan.slug === "1month") {
      return {
        ...plan,
        price: config.plan1MonthPrice ?? plan.price,
        originalPrice: config.plan1MonthOriginalPrice ?? plan.originalPrice,
      };
    } else if (plan.slug === "3month") {
      return {
        ...plan,
        price: config.plan3MonthPrice ?? plan.price,
        originalPrice: config.plan3MonthOriginalPrice ?? plan.originalPrice,
      };
    }
    return plan;
  });
}

export default PlatformConfig;
