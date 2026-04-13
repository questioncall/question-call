import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const courseCouponRedemptionSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "CourseCoupon",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
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

courseCouponRedemptionSchema.index(
  { couponId: 1, studentId: 1, courseId: 1 },
  { unique: true, name: "course_coupon_redemption_unique_scope" },
);

export type CourseCouponRedemptionRecord = InferSchemaType<typeof courseCouponRedemptionSchema>;
export type CourseCouponRedemptionDocument =
  HydratedDocument<CourseCouponRedemptionRecord>;

const CourseCouponRedemption =
  models.CourseCouponRedemption ||
  model("CourseCouponRedemption", courseCouponRedemptionSchema);

export default CourseCouponRedemption;
