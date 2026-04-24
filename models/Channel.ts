import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export const CHANNEL_STATUSES = ["ACTIVE", "CLOSED", "EXPIRED"] as const;
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

const channelSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    askerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    acceptorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    openedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    timerDeadline: {
      type: Date,
      required: true,
    },
    timeExtensionCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    lastDeadlineWarningAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: CHANNEL_STATUSES,
      default: "ACTIVE",
      required: true,
      index: true,
    },
    isClosedByAsker: {
      type: Boolean,
      default: false,
    },
    ratingGiven: {
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

// Compound index for finding user's channels
channelSchema.index({ askerId: 1, status: 1 });
channelSchema.index({ acceptorId: 1, status: 1 });
// For the expiration cron
channelSchema.index({ status: 1, timerDeadline: 1 });

export type ChannelRecord = InferSchemaType<typeof channelSchema>;
export type ChannelDocument = HydratedDocument<ChannelRecord>;

const Channel = models.Channel || model("Channel", channelSchema);

export default Channel;
