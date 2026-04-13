import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const videoProgressSchema = new Schema(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "CourseEnrollment",
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
      required: true,
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "CourseSection",
      required: true,
      index: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: "CourseVideo",
      required: true,
      index: true,
    },
    watchedPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
    firstWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

videoProgressSchema.index(
  { studentId: 1, videoId: 1 },
  { unique: true, name: "video_progress_unique_student_video" },
);

export type VideoProgressRecord = InferSchemaType<typeof videoProgressSchema>;
export type VideoProgressDocument = HydratedDocument<VideoProgressRecord>;

const VideoProgress = models.VideoProgress || model("VideoProgress", videoProgressSchema);

export default VideoProgress;
