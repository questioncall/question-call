import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const platformConfigSchema = new Schema(
  {
    // Format pricing (in smallest currency unit, e.g. paisa)
    textFormatPrice: {
      type: Number,
      default: 50,
      min: 0,
    },
    photoFormatPrice: {
      type: Number,
      default: 100,
      min: 0,
    },
    videoFormatPrice: {
      type: Number,
      default: 200,
      min: 0,
    },

    // Format time limits in minutes
    textFormatDuration: {
      type: Number,
      default: 30,
      min: 1,
    },
    photoFormatDuration: {
      type: Number,
      default: 60,
      min: 1,
    },
    videoFormatDuration: {
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
 * Returns the time limit in minutes for a given format.
 */
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

export default PlatformConfig;
