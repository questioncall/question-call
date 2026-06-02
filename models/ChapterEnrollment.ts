import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

// Mirrors CourseEnrollment, for standalone Chapters. A student gets one of
// these when they enrol in (free) / buy / subscribe to a chapter.
const CHAPTER_ACCESS_TYPES = ["FREE", "SUBSCRIPTION", "COUPON", "PURCHASE"] as const;

const chapterEnrollmentSchema = new Schema(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
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
      enum: CHAPTER_ACCESS_TYPES,
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
    completedContentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalContentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: false,
  },
);

chapterEnrollmentSchema.index(
  { chapterId: 1, studentId: 1 },
  { unique: true, name: "chapter_enrollment_unique_student_chapter" },
);

export type ChapterEnrollmentRecord = InferSchemaType<typeof chapterEnrollmentSchema>;
export type ChapterEnrollmentDocument = HydratedDocument<ChapterEnrollmentRecord>;

const ChapterEnrollment =
  models.ChapterEnrollment || model("ChapterEnrollment", chapterEnrollmentSchema);

export default ChapterEnrollment;
