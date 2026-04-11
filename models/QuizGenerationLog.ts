import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const quizGenerationLogSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    adminEmail: {
      type: String,
      default: null,
      trim: true,
      maxlength: 180,
    },
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "QuizTopic",
      default: null,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    level: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    field: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    mode: {
      type: String,
      enum: ["STARTER_SEED", "TOPIC_SEED", "SMART_SEED"],
      required: true,
      index: true,
    },
    searchQuery: {
      type: String,
      default: null,
      trim: true,
      maxlength: 300,
    },
    requestedCount: {
      type: Number,
      required: true,
      min: 1,
    },
    createdCount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

quizGenerationLogSchema.index(
  { adminId: 1, createdAt: -1 },
  { name: "quiz_generation_admin_created_idx" },
);
quizGenerationLogSchema.index(
  { createdAt: -1 },
  { name: "quiz_generation_created_idx" },
);

export type QuizGenerationLogRecord = InferSchemaType<typeof quizGenerationLogSchema>;
export type QuizGenerationLogDocument = HydratedDocument<QuizGenerationLogRecord>;

const QuizGenerationLog =
  models.QuizGenerationLog || model("QuizGenerationLog", quizGenerationLogSchema);

export default QuizGenerationLog;
