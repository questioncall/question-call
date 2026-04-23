import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export const MESSAGE_MEDIA_TYPES = ["TEXT", "IMAGE", "VIDEO", "AUDIO"] as const;
export type MessageMediaType = (typeof MESSAGE_MEDIA_TYPES)[number];

const messageSchema = new Schema({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    default: "",
    maxlength: 5000,
  },
  mediaUrl: {
    type: String,
    default: null,
  },
  mediaType: {
    type: String,
    enum: [...MESSAGE_MEDIA_TYPES, null],
    default: null,
  },
  isSystemMessage: {
    type: Boolean,
    default: false,
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
  isDelivered: {
    type: Boolean,
    default: true, // Assuming delivered when saved to DB for now
  },
  isMarkedAsAnswer: {
    type: Boolean,
    default: false,
  },
  // ─── Soft-delete fields ─────────────────────────────────────
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // ─── Cloudinary asset tracking (for cleanup on delete) ──────
  mediaPublicId: {
    type: String,
    default: null,
  },
  callMetadata: {
    type: {
      callSessionId: { type: String, required: true },
      mode: { type: String, enum: ["AUDIO", "VIDEO"], required: true },
      status: { type: String, enum: ["ENDED", "REJECTED", "MISSED"], required: true },
      durationSeconds: { type: Number, default: null },
      callerName: { type: String, default: "Unknown" },
      callerId: { type: String, required: true },
    },
    default: null,
  },
  sentAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Efficient message listing within a channel
messageSchema.index({ channelId: 1, sentAt: 1 });

export type MessageRecord = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<MessageRecord>;

const Message = models.Message || model("Message", messageSchema);

export default Message;
