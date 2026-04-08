import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";


const answerSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    acceptorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    answerFormat: {
      type: String,
      enum: ["TEXT", "PHOTO", "VIDEO", "ANY"],
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    rating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

export type AnswerRecord = InferSchemaType<typeof answerSchema>;
export type AnswerDocument = HydratedDocument<AnswerRecord>;

const Answer = models.Answer || model("Answer", answerSchema);

export default Answer;
