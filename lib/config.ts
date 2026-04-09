/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                    EduAsk — Platform Config                     ║
 * ║                                                                  ║
 * ║  Single source of truth for all tunable platform values.         ║
 * ║  Change values HERE and the entire codebase reacts.              ║
 * ║                                                                  ║
 * ║  ⚙️  Client wants to change trial days? → TRIAL section          ║
 * ║  ⚙️  Client wants to adjust pricing?    → PLANS section          ║
 * ║  ⚙️  Client wants to tweak payouts?     → TEACHER section        ║
 * ║  ⚙️  Client wants to change durations?  → FORMAT section         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────────────────────────────
// 1. FREE TRIAL
// ─────────────────────────────────────────────────────────────────────

export const TRIAL = {
  /** Number of free trial days given to every new student on signup */
  DURATION_DAYS: 3,

  /** Max questions a student can ask during the free trial */
  MAX_QUESTIONS: 5,
} as const;

// ─────────────────────────────────────────────────────────────────────
// 2. SUBSCRIPTION PLANS
//    Shape used by the pricing UI. Only edit values here.
// ─────────────────────────────────────────────────────────────────────

export type PlanDef = {
  name: string;
  price: number;           // NPR the student pays
  originalPrice: number | null;  // strike-through price (null = no strike)
  badge: string | null;
  suffix: string;
  slug: string;
  color: string;
  titleClass: string;
  features: string[];
  highlight: boolean;
  tax: number;
  durationDays: number;
  maxQuestions: number | null;  // null = unlimited
};

export const SUBSCRIPTION_PLANS: PlanDef[] = [
  {
    name: "Free",
    price: 0,
    originalPrice: null,
    badge: null,
    suffix: "",
    slug: "free",
    color: "#4154F1",
    titleClass: "text-[#182B49] dark:text-neutral-100",
    features: [
      `${TRIAL.DURATION_DAYS} days free trial`,
      `Ask up to ${TRIAL.MAX_QUESTIONS} questions`,
      "Access to public feed",
    ],
    highlight: false,
    tax: 0,
    durationDays: TRIAL.DURATION_DAYS,
    maxQuestions: TRIAL.MAX_QUESTIONS,
  },
  {
    name: "1 Month Plan",
    price: 50,
    originalPrice: 100,
    badge: "Most Popular",
    suffix: "/ month",
    slug: "1month",
    color: "#1B7258",
    titleClass: "text-[#114A39] dark:text-neutral-100",
    features: [
      "Ask up to 50 questions",
      "Access to private answers",
      "Earn 2x discount points",
    ],
    highlight: true,
    tax: 0,
    durationDays: 30,
    maxQuestions: 50,
  },
  {
    name: "3 Month Plan",
    price: 140,
    originalPrice: 250,
    badge: "Best Value",
    suffix: "/ 3 months",
    slug: "3month",
    color: "#8A2BE2",
    titleClass: "text-[#4A1578] dark:text-neutral-100",
    features: [
      "Unlimited questions",
      "Priority AI validation",
      "Maximum discount points",
    ],
    highlight: false,
    tax: 0,
    durationDays: 90,
    maxQuestions: null,
  },
];

// ─────────────────────────────────────────────────────────────────────
// 3. ANSWER FORMAT DURATIONS & PRICING
//    How long a teacher gets per format, and what they earn per solve.
// ─────────────────────────────────────────────────────────────────────

export const FORMAT = {
  TEXT: {
    /** Minutes allowed for a text answer */
    DURATION_MINUTES: 30,
    /** NPR the teacher earns (before commission) for a text answer */
    PRICE: 50,
  },
  PHOTO: {
    DURATION_MINUTES: 60,
    PRICE: 100,
  },
  VIDEO: {
    DURATION_MINUTES: 180,
    PRICE: 200,
  },
  /** Fallback when student picks "ANY" format */
  ANY: {
    DURATION_MINUTES: 60,   // defaults to PHOTO duration
    PRICE: 100,             // defaults to PHOTO price
  },
} as const;

/** Helper: get duration in minutes for a given answerFormat string */
export function getFormatDuration(answerFormat: string): number {
  switch (answerFormat) {
    case "TEXT":  return FORMAT.TEXT.DURATION_MINUTES;
    case "PHOTO": return FORMAT.PHOTO.DURATION_MINUTES;
    case "VIDEO": return FORMAT.VIDEO.DURATION_MINUTES;
    default:      return FORMAT.ANY.DURATION_MINUTES;
  }
}

/** Helper: get teacher earning price for a given answerFormat string */
export function getFormatPrice(answerFormat: string): number {
  switch (answerFormat) {
    case "TEXT":  return FORMAT.TEXT.PRICE;
    case "PHOTO": return FORMAT.PHOTO.PRICE;
    case "VIDEO": return FORMAT.VIDEO.PRICE;
    default:      return FORMAT.ANY.PRICE;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 4. TEACHER & MONETIZATION
// ─────────────────────────────────────────────────────────────────────

export const TEACHER = {
  /** Number of answers a teacher must complete before earnings unlock */
  QUALIFICATION_THRESHOLD: 10,

  /** Platform commission percentage deducted from teacher earnings */
  COMMISSION_PERCENT: 15,

  /** Score points deducted from teacher when they fail to answer in time */
  TIMEOUT_SCORE_DEDUCTION: 5,

  /**
   * Rating bonus multiplier applied to earnings.
   * Formula: base × (rating / 5) × RATING_BONUS_MULTIPLIER
   * e.g. 1.5 means a 5-star answer earns 1.5× the base rate.
   */
  RATING_BONUS_MULTIPLIER: 1.5,
} as const;

/**
 * Calculate the net teacher earning for a completed answer.
 * @param answerFormat - "TEXT" | "PHOTO" | "VIDEO" | "ANY"
 * @param rating      - Student rating 1–5
 * @returns NPR amount credited to teacher wallet
 */
export function calculateTeacherEarning(answerFormat: string, rating: number): number {
  const basePrice = getFormatPrice(answerFormat);
  const afterCommission = basePrice * (1 - TEACHER.COMMISSION_PERCENT / 100);
  const ratingFactor = (rating / 5) * TEACHER.RATING_BONUS_MULTIPLIER;
  return Math.round(afterCommission * ratingFactor * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────
// 5. PLATFORM MISC
// ─────────────────────────────────────────────────────────────────────

export const PLATFORM = {
  /** Name shown in headers, emails, etc. */
  NAME: "Question Hub",

  /** Supported payment gateways */
  GATEWAYS: ["MANUAL", "ESEWA"] as const,

  /** Default currency */
  CURRENCY: "NPR",

  /** Max file upload size in MB (for screenshots, answers, etc.) */
  MAX_UPLOAD_SIZE_MB: 10,
} as const;
