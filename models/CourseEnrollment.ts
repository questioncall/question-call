import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const COURSE_ACCESS_TYPES = ["FREE", "SUBSCRIPTION", "COUPON", "PURCHASE"] as const;

const courseEnrollmentSchema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accessType: {
      type: String,
      enum: COURSE_ACCESS_TYPES,
      required: true,
      index: true,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "CourseCoupon",
      default: null,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    pricePaid: {
      type: Number,
      default: null,
      min: 0,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    overallProgressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedVideoCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVideoCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: false,
  },
);

courseEnrollmentSchema.index(
  { courseId: 1, studentId: 1 },
  { unique: true, name: "course_enrollment_unique_student_course" },
);

export type CourseEnrollmentRecord = InferSchemaType<typeof courseEnrollmentSchema>;
export type CourseEnrollmentDocument = HydratedDocument<CourseEnrollmentRecord>;

const CourseEnrollment =
  models.CourseEnrollment || model("CourseEnrollment", courseEnrollmentSchema);

export default CourseEnrollment;
