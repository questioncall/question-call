/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║               QUESTION HUB — Platform Config                     ║
 * ║                                                                  ║
 * ║  INITIAL SEED DATA — values below are used ONLY on first boot   ║
 * ║  to populate the PlatformConfig collection in MongoDB.           ║
 * ║  After that, the entire app reads from the DB-cached             ║
 * ║  PlatformConfig via getPlatformConfig() in                       ║
 * ║  models/PlatformConfig.ts. Changing values here will NOT affect  ║
 * ║  an existing deployment — use the Admin Panel instead.           ║
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
// 3. ANSWER FORMAT DURATIONS & POINTS EARNING
//    Teachers earn POINTS per answer (not cash).
//    Points convert to NPR at a rate set by admin (default 1:1).
// ─────────────────────────────────────────────────────────────────────

export const FORMAT = {
  TEXT: {
    /** Minutes allowed for a text answer */
    DURATION_MINUTES: 30,
    /** Points the teacher earns for a text answer (base, before rating bonus) */
    POINTS: 5,
  },
  PHOTO: {
    DURATION_MINUTES: 60,
    POINTS: 10,
  },
  VIDEO: {
    DURATION_MINUTES: 180,
    POINTS: 20,
  },
  /** Fallback when student picks "ANY" format */
  ANY: {
    DURATION_MINUTES: 60,   // defaults to PHOTO duration
    POINTS: 10,             // defaults to PHOTO points
  },
} as const;

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

  /** Bonus points awarded for a 4-star rating */
  BONUS_POINTS_4_STAR: 2,

  /** Bonus points awarded for a 5-star rating */
  BONUS_POINTS_5_STAR: 5,

  /** Points deducted for a 1-2 star rating */
  PENALTY_POINTS_LOW_RATING: 2,
} as const;

// ─────────────────────────────────────────────────────────────────────
// 5. WITHDRAWAL / POINTS CONVERSION
// ─────────────────────────────────────────────────────────────────────

export const WITHDRAWAL = {
  /** 1 point = this many NPR */
  POINT_TO_NPR_RATE: 1,

  /** Minimum points required to request a withdrawal */
  MIN_WITHDRAWAL_POINTS: 50,
} as const;

// ─────────────────────────────────────────────────────────────────────
// 6. PLATFORM MISC
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
