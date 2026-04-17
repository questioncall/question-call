import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export const NOTICE_TYPES = ["ADVERTISEMENT", "GENERAL", "SPECIAL"] as const;
export const NOTICE_AUDIENCES = ["ALL", "TEACHER", "STUDENT", "SPECIFIC"] as const;

const noticeSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000, // Can contain basic HTML
    },
    type: {
      type: String,
      enum: NOTICE_TYPES,
      default: "GENERAL",
      required: true,
    },
    targetAudience: {
      type: String,
      enum: NOTICE_AUDIENCES,
      default: "ALL",
      required: true,
    },
    targetEmails: {
      type: [String],
      default: [],
      // Only utilized if targetAudience === "SPECIFIC"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize query for fetching active notices
noticeSchema.index({ isActive: 1, targetAudience: 1, createdAt: -1 });

export type NoticeRecord = InferSchemaType<typeof noticeSchema>;
export type NoticeDocument = HydratedDocument<NoticeRecord>;

const Notice = models.Notice || model("Notice", noticeSchema);

export default Notice;
