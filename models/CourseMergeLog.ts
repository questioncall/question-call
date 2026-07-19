import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const courseMergeLogSchema = new Schema(
  {
    targetCourseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    sourceCourseIds: {
      type: [Schema.Types.ObjectId],
      required: true,
    },
    // Titles snapshotted at merge time — the sources are archived afterwards
    // and may be renamed/cleaned up later.
    sourceTitles: {
      type: [String],
      default: [],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Moved-entity counts, deactivated coupons, etc. (the executed impact report).
    summary: {
      type: Schema.Types.Mixed,
      default: {},
    },
    mergedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

export type CourseMergeLogRecord = InferSchemaType<typeof courseMergeLogSchema>;
export type CourseMergeLogDocument = HydratedDocument<CourseMergeLogRecord>;

const CourseMergeLog =
  models.CourseMergeLog || model("CourseMergeLog", courseMergeLogSchema);

export default CourseMergeLog;
