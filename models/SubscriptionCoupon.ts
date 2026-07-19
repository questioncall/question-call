import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export const SUBSCRIPTION_COUPON_KINDS = ["FREE_ACCESS", "PERCENTAGE"] as const;
export type SubscriptionCouponKind = (typeof SUBSCRIPTION_COUPON_KINDS)[number];

export const SUBSCRIPTION_COUPON_MAX_EMAILS = 500;

const subscriptionCouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: SUBSCRIPTION_COUPON_KINDS,
      required: true,
      index: true,
    },
    // FREE_ACCESS: required plan the coupon grants.
    // PERCENTAGE: null = discount applies to any paid plan.
    planSlug: {
      type: String,
      default: null,
      trim: true,
    },
    // FREE_ACCESS only. null = the plan's own durationDays.
    durationDays: {
      type: Number,
      default: null,
      min: 1,
    },
    // PERCENTAGE only.
    discountPercentage: {
      type: Number,
      min: 1,
      max: 100,
    },
    // Lowercased at save. Empty = anyone may redeem.
    allowedEmails: {
      type: [String],
      default: [],
    },
    // "First N redeemers". null = unlimited.
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    // Free-text attribution label, e.g. "YT promo — CreatorName".
    campaign: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

subscriptionCouponSchema.pre("validate", function () {
  if (typeof this.code === "string") {
    this.code = this.code.trim().toUpperCase();
  }

  if (Array.isArray(this.allowedEmails)) {
    this.allowedEmails = [
      ...new Set(
        this.allowedEmails
          .map((email) => String(email).trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (this.allowedEmails.length > SUBSCRIPTION_COUPON_MAX_EMAILS) {
      this.invalidate(
        "allowedEmails",
        `At most ${SUBSCRIPTION_COUPON_MAX_EMAILS} emails are allowed per coupon.`,
      );
    }
  }

  if (this.kind === "FREE_ACCESS") {
    if (!this.planSlug) {
      this.invalidate("planSlug", "Free-access coupons must target a plan.");
    }
    this.discountPercentage = undefined;
  }

  if (this.kind === "PERCENTAGE") {
    if (typeof this.discountPercentage !== "number") {
      this.invalidate(
        "discountPercentage",
        "Percentage coupons need a discountPercentage.",
      );
    }
    this.durationDays = null;
  }
});

subscriptionCouponSchema.index(
  { code: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "subscription_coupon_code_unique_ci",
  },
);

export type SubscriptionCouponRecord = InferSchemaType<typeof subscriptionCouponSchema>;
export type SubscriptionCouponDocument = HydratedDocument<SubscriptionCouponRecord>;

const SubscriptionCoupon =
  models.SubscriptionCoupon || model("SubscriptionCoupon", subscriptionCouponSchema);

export default SubscriptionCoupon;
