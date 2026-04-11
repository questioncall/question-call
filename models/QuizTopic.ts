import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const quizTopicSchema = new Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    level: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    field: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    searchAliases: {
      type: [String],
      default: [],
      validate: {
        validator(value: string[]) {
          return Array.isArray(value) && value.every((item) => item.trim().length > 0);
        },
        message: "Quiz topic aliases must be non-empty strings.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

quizTopicSchema.index(
  { subject: 1, topic: 1, level: 1 },
  { unique: true, name: "quiz_topic_unique_triplet" },
);

export type QuizTopicRecord = InferSchemaType<typeof quizTopicSchema>;
export type QuizTopicDocument = HydratedDocument<QuizTopicRecord>;

const QuizTopic = models.QuizTopic || model("QuizTopic", quizTopicSchema);

export default QuizTopic;
