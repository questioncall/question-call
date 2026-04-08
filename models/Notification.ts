import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export const NOTIFICATION_TYPES = [
  "RATING_RECEIVED",
  "QUESTION_ACCEPTED",
  "QUESTION_RESET",
  "CHANNEL_CLOSED",
  "PAYMENT",
  "ANSWER_SUBMITTED",
  "DEADLINE_WARNING",
] as const;

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export type NotificationRecord = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = HydratedDocument<NotificationRecord>;

const Notification = models.Notification || model("Notification", notificationSchema);

export default Notification;
