import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const COURSE_NOTIFICATION_STATUSES = ["SENT", "FAILED"] as const;
const COURSE_NOTIFICATION_CHANNELS = ["EMAIL", "WHATSAPP"] as const;

const courseNotificationLogSchema = new Schema(
  {
    liveSessionId: {
      type: Schema.Types.ObjectId,
      ref: "LiveSession",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channels: {
      type: [{ type: String, enum: COURSE_NOTIFICATION_CHANNELS }],
      default: [],
    },
    status: {
      type: String,
      enum: COURSE_NOTIFICATION_STATUSES,
      required: true,
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

export type CourseNotificationLogRecord = InferSchemaType<typeof courseNotificationLogSchema>;
export type CourseNotificationLogDocument = HydratedDocument<CourseNotificationLogRecord>;

const CourseNotificationLog =
  models.CourseNotificationLog || model("CourseNotificationLog", courseNotificationLogSchema);

export default CourseNotificationLog;
