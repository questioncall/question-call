import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const platformConfigSchema = new Schema(
  {
    // Tier pricing (in smallest currency unit, e.g. paisa)
    tierFirstPrice: {
      type: Number,
      default: 50,
      min: 0,
    },
    tierSecondPrice: {
      type: Number,
      default: 100,
      min: 0,
    },
    tierThirdPrice: {
      type: Number,
      default: 200,
      min: 0,
    },

    // Tier time limits in minutes
    tierFirstDuration: {
      type: Number,
      default: 30,
      min: 1,
    },
    tierSecondDuration: {
      type: Number,
      default: 60,
      min: 1,
    },
    tierThirdDuration: {
      type: Number,
      default: 180,
      min: 1,
    },

    // Platform settings
    commissionPercent: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
    },
    scoreDeductionAmount: {
      type: Number,
      default: 5,
      min: 0,
    },
    qualificationThreshold: {
      type: Number,
      default: 10,
      min: 1,
    },
    trialDays: {
      type: Number,
      default: 3,
      min: 1,
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

/**
 * Returns the singleton PlatformConfig document.
 * Creates one with defaults if it doesn't exist.
 */
export async function getPlatformConfig(): Promise<PlatformConfigDocument> {
  let config = await PlatformConfig.findOne();

  if (!config) {
    config = await PlatformConfig.create({});
  }

  return config as PlatformConfigDocument;
}

/**
 * Returns the time limit in minutes for a given tier.
 */
export function getTierDurationMinutes(
  config: PlatformConfigDocument,
  tier: string,
): number {
  switch (tier) {
    case "ONE":
      return config.tierFirstDuration;
    case "TWO":
      return config.tierSecondDuration;
    case "THREE":
      return config.tierThirdDuration;
    default:
      // UNSET defaults to Tier II duration
      return config.tierSecondDuration;
  }
}

export default PlatformConfig;
