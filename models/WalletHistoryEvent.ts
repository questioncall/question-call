import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export const WALLET_HISTORY_EVENT_TYPES = [
  "ANSWER_REWARD",
  "AUTO_CLOSE_REWARD",
  "LOW_RATING_PENALTY",
  "TIMEOUT_PENALTY",
  "MONTHLY_BONUS",
] as const;

const walletHistoryEventSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: WALLET_HISTORY_EVENT_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    pointsDelta: {
      type: Number,
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

walletHistoryEventSchema.index({ userId: 1, occurredAt: -1 });

export type WalletHistoryEventType = (typeof WALLET_HISTORY_EVENT_TYPES)[number];
export type WalletHistoryEventRecord = InferSchemaType<
  typeof walletHistoryEventSchema
>;
export type WalletHistoryEventDocument = HydratedDocument<
  WalletHistoryEventRecord
>;

const WalletHistoryEvent =
  models.WalletHistoryEvent ||
  model("WalletHistoryEvent", walletHistoryEventSchema);

export default WalletHistoryEvent;
