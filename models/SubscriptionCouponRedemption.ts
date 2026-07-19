import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const subscriptionCouponRedemptionSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionCoupon",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Snapshot of the redeeming account's email (allowlist audits stay
    // meaningful even if the user later changes their address).
    emailSnapshot: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    planSlug: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ["FREE_ACCESS", "PERCENTAGE"],
      required: true,
    },
    // Set for PERCENTAGE redemptions (the discounted purchase); null for
    // FREE_ACCESS unless an audit transaction was recorded.
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

subscriptionCouponRedemptionSchema.index(
  { couponId: 1, userId: 1 },
  { unique: true, name: "subscription_coupon_redemption_unique_user" },
);

export type SubscriptionCouponRedemptionRecord = InferSchemaType<
  typeof subscriptionCouponRedemptionSchema
>;
export type SubscriptionCouponRedemptionDocument =
  HydratedDocument<SubscriptionCouponRedemptionRecord>;

const SubscriptionCouponRedemption =
  models.SubscriptionCouponRedemption ||
  model("SubscriptionCouponRedemption", subscriptionCouponRedemptionSchema);

export default SubscriptionCouponRedemption;
