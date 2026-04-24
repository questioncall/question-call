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

export type TeacherPayoutBreakdown = {
  rating: number;
  ratingPoints: number;
  bonusPoints: number;
  grossPoints: number;
  commissionPercent: number;
  commissionPoints: number;
  finalPoints: number;
  penaltyPoints: number;
  isPenalty: boolean;
};

function getRatingPoints(
  rating: number,
  config: PlatformConfigDocument,
): number {
  switch (rating) {
    case 5:
      return config.ratingPointsFor5Star ?? 5;
    case 4:
      return config.ratingPointsFor4Star ?? 4;
    case 3:
      return config.ratingPointsFor3Star ?? 3;
    case 2:
      return config.ratingPointsFor2Star ?? 2;
    default:
      return 0;
  }
}

function getRatingBonusPoints(
  rating: number,
  config: PlatformConfigDocument,
): number {
  if (rating === 5) return config.bonusPointsFor5Star;
  if (rating === 4) return config.bonusPointsFor4Star;
  if (rating === 3) return config.bonusPointsFor3Star || 0;
  if (rating === 2) return config.bonusPointsFor2Star || 0;
  if (rating === 1) return -config.penaltyPointsForLowRating;
  return 0;
}

export function calcTeacherPayoutBreakdown(
  rating: number,
  config: PlatformConfigDocument,
): TeacherPayoutBreakdown {
  if (rating === 1) {
    return {
      rating,
      ratingPoints: 0,
      bonusPoints: 0,
      grossPoints: 0,
      commissionPercent: config.commissionPercent ?? 0,
      commissionPoints: 0,
      finalPoints: 0,
      penaltyPoints: roundPoints(config.penaltyPointsForLowRating ?? 0),
      isPenalty: true,
    };
  }

  const ratingPoints = roundPoints(getRatingPoints(rating, config));
  const bonusPoints = roundPoints(Math.max(0, getRatingBonusPoints(rating, config)));
  const grossPoints = roundPoints(ratingPoints + bonusPoints);
  const commissionPercent = roundPoints(Math.max(0, config.commissionPercent ?? 0));
  const commissionPoints = roundPoints((grossPoints * commissionPercent) / 100);
  const finalPoints = roundPoints(Math.max(0, grossPoints - commissionPoints));

  return {
    rating,
    ratingPoints,
    bonusPoints,
    grossPoints,
    commissionPercent,
    commissionPoints,
    finalPoints,
    penaltyPoints: 0,
    isPenalty: false,
  };
}

/**
 * Total points earned for one completed answer.
 * Use this as the single source of truth.
 */
export function calcTotalPointsEarned(
  _answerFormat: string,
  rating: number,
  config: PlatformConfigDocument,
): number {
  return calcTeacherPayoutBreakdown(rating, config).finalPoints;
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
