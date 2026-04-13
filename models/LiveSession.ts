import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const LIVE_SESSION_STATUSES = ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"] as const;
const LIVE_SESSION_CHANNELS = ["EMAIL", "WHATSAPP"] as const;
const LIVE_SESSION_RECORDING_METHODS = ["UPLOAD", "ZOOM_LINK", "ZOOM_API"] as const;

const liveSessionSchema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "CourseSection",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: null,
      min: 0,
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    zoomLink: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: LIVE_SESSION_STATUSES,
      default: "SCHEDULED",
      index: true,
    },
    notificationsSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: {
      type: Date,
      default: null,
    },
    notificationChannels: {
      type: [{ type: String, enum: LIVE_SESSION_CHANNELS }],
      default: [],
    },
    recordingMethod: {
      type: String,
      enum: LIVE_SESSION_RECORDING_METHODS,
      default: null,
    },
    recordingUrl: {
      type: String,
      default: null,
      trim: true,
    },
    recordingCloudinaryId: {
      type: String,
      default: null,
      trim: true,
    },
    muxAssetId: {
      type: String,
      default: null,
      trim: true,
    },
    muxPlaybackId: {
      type: String,
      default: null,
      trim: true,
    },
    recordingAddedAt: {
      type: Date,
      default: null,
    },
    courseVideoId: {
      type: Schema.Types.ObjectId,
      ref: "CourseVideo",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

liveSessionSchema.index({ courseId: 1, scheduledAt: -1 }, { name: "live_session_course_scheduled_idx" });

export type LiveSessionRecord = InferSchemaType<typeof liveSessionSchema>;
export type LiveSessionDocument = HydratedDocument<LiveSessionRecord>;

const LiveSession = models.LiveSession || model("LiveSession", liveSessionSchema);

export default LiveSession;
