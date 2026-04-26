import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const COURSE_COUPON_SCOPES = ["COURSE", "GLOBAL"] as const;

const courseCouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["FULL_ACCESS", "PERCENTAGE"],
      default: "PERCENTAGE",
      required: true,
    },
    discountPercentage: {
      type: Number,
      min: 1,
      max: 100,
    },
    scope: {
      type: String,
      enum: COURSE_COUPON_SCOPES,
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
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
    expiryDate: {
      type: Date,
      default: null,
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

courseCouponSchema.pre("validate", function () {
  if (typeof this.code === "string") {
    this.code = this.code.trim().toUpperCase();
  }

  if (this.scope === "COURSE" && !this.courseId) {
    this.invalidate("courseId", "Course-scoped coupons must target a course.");
  }

  if (this.scope === "GLOBAL") {
    this.courseId = null;
  }
});

courseCouponSchema.index(
  { code: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "course_coupon_code_unique_ci",
  },
);

export type CourseCouponRecord = InferSchemaType<typeof courseCouponSchema>;
export type CourseCouponDocument = HydratedDocument<CourseCouponRecord>;

const CourseCoupon = models.CourseCoupon || model("CourseCoupon", courseCouponSchema);

export default CourseCoupon;
