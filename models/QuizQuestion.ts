import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const quizQuestionSchema = new Schema(
  {
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "QuizTopic",
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 2000,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator(value: string[]) {
          return Array.isArray(value) && value.length === 4 && value.every((item) => item.trim().length > 0);
        },
        message: "Quiz questions must include exactly four non-empty options.",
      },
    },
    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    explanation: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

export type QuizQuestionRecord = InferSchemaType<typeof quizQuestionSchema>;
export type QuizQuestionDocument = HydratedDocument<QuizQuestionRecord>;

const QuizQuestion = models.QuizQuestion || model("QuizQuestion", quizQuestionSchema);

export default QuizQuestion;
