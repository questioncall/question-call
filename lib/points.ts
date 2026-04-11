import type { PlatformConfigDocument } from "@/models/PlatformConfig";

export function roundPoints(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatPoints(value: number) {
  const rounded = roundPoints(value);

  if (Number.isInteger(rounded)) {
    return `${rounded}`;
  }

  return rounded.toFixed(2);
}

/**
 * Calculate base points earned for submitting an answer.
 * Call this when a channel is closed by the asker.
 */
export function calcBasePoints(
  answerFormat: string,
  config: PlatformConfigDocument,
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
 * Calculate bonus/penalty points based on rating given by student.
 * rating: 1–5
 * Returns a positive number (bonus) or negative number (penalty).
 */
export function calcRatingAdjustment(
  rating: number,
  config: PlatformConfigDocument,
): number {
  if (rating === 5) return config.bonusPointsFor5Star;
  if (rating === 4) return config.bonusPointsFor4Star;
  if (rating <= 2) return -config.penaltyPointsForLowRating;
  return 0; // rating === 3, no adjustment
}

/**
 * Total points earned for one completed answer.
 * Use this as the single source of truth.
 */
export function calcTotalPointsEarned(
  answerFormat: string,
  rating: number,
  config: PlatformConfigDocument,
): number {
  const base = calcBasePoints(answerFormat, config);
  const adjustment = calcRatingAdjustment(rating, config);
  // Never go below 0 for a single transaction
  return Math.max(0, base + adjustment);
}

/**
 * Convert points to NPR. Rate is always read from platformConfig() — never hardcoded.
 */
export function pointsToNpr(
  points: number,
  config: PlatformConfigDocument,
): number {
  return roundPoints(points * config.pointToNprRate);
}
