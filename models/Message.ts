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
