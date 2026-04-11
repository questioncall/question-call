import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const quizAnswerSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "QuizQuestion",
      required: true,
    },
    selectedOptionIndex: {
      type: Number,
      default: null,
      min: 0,
      max: 3,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const quizViolationEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "FULLSCREEN_EXIT",
        "TAB_HIDDEN",
        "WINDOW_BLUR",
        "PAGE_HIDE",
        "BEFORE_UNLOAD",
        "BACK_NAVIGATION",
        "DUPLICATE_TAB",
      ],
      required: true,
    },
    details: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const quizConfigSnapshotSchema = new Schema(
  {
    questionCount: {
      type: Number,
      required: true,
      min: 1,
    },
    timeLimitSeconds: {
      type: Number,
      required: true,
      min: 60,
    },
    repeatResetDays: {
      type: Number,
      required: true,
      min: 1,
    },
    dailySessionLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    passPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    pointReward: {
      type: Number,
      required: true,
      min: 0,
    },
    violationWarningLimit: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const quizSessionSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quizType: {
      type: String,
      enum: ["FREE", "PREMIUM"],
      required: true,
      index: true,
    },
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "QuizTopic",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      required: true,
      trim: true,
    },
    questionsAsked: {
      type: [{ type: Schema.Types.ObjectId, ref: "QuizQuestion" }],
      required: true,
      validate: {
        validator(value: unknown[]) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Quiz sessions must contain at least one question.",
      },
    },
    answers: {
      type: [quizAnswerSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "SUBMITTED"],
      default: "IN_PROGRESS",
      index: true,
    },
    timerDeadline: {
      type: Date,
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    submitReason: {
      type: String,
      enum: ["MANUAL", "TIME_EXPIRED", "ANTI_CHEAT"],
      default: null,
    },
    violationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    violationEvents: {
      type: [quizViolationEventSchema],
      default: [],
    },
    configSnapshot: {
      type: quizConfigSnapshotSchema,
      required: true,
    },
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

quizSessionSchema.index({ studentId: 1, status: 1, startedAt: -1 }, { name: "quiz_student_status_started_idx" });
quizSessionSchema.index({ studentId: 1, quizType: 1, startedAt: -1 }, { name: "quiz_student_type_started_idx" });

export type QuizSessionRecord = InferSchemaType<typeof quizSessionSchema>;
export type QuizSessionDocument = HydratedDocument<QuizSessionRecord>;

const QuizSession = models.QuizSession || model("QuizSession", quizSessionSchema);

export default QuizSession;
