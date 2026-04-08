import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

import {
  ANSWER_VISIBILITY_OPTIONS,
  QUESTION_STATUSES,
  ANSWER_FORMATS,
  REACTION_TYPES,
} from "@/lib/question-types";

const reactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: REACTION_TYPES,
      required: true,
    },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    askerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 180,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 12,
      maxlength: 5000,
    },
    images: {
      type: [String],
      default: [],
    },
    answerFormat: {
      type: String,
      enum: ANSWER_FORMATS,
      default: "ANY",
      required: true,
    },
    answerVisibility: {
      type: String,
      enum: ANSWER_VISIBILITY_OPTIONS,
      default: "PUBLIC",
      required: true,
    },
    status: {
      type: String,
      enum: QUESTION_STATUSES,
      default: "OPEN",
      required: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    stream: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    level: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    resetCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    acceptedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    answerId: {
      type: Schema.Types.ObjectId,
      ref: "Answer",
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

questionSchema.index({ status: 1, resetCount: -1, createdAt: -1 });
questionSchema.index({ askerId: 1, createdAt: -1 });
questionSchema.index({ title: "text", body: "text" });

export type QuestionRecord = InferSchemaType<typeof questionSchema>;
export type QuestionDocument = HydratedDocument<QuestionRecord>;

const Question = models.Question || model("Question", questionSchema);

export default Question;
