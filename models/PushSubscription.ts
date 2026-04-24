import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const pushSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    expirationTime: {
      type: Number,
      default: null,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type PushSubscriptionRecord = InferSchemaType<typeof pushSubscriptionSchema>;
export type PushSubscriptionDocument = HydratedDocument<PushSubscriptionRecord>;

const PushSubscriptionModel =
  models.PushSubscription || model("PushSubscription", pushSubscriptionSchema);

export default PushSubscriptionModel;
