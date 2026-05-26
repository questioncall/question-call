import { Schema, model, models } from "mongoose";

const dailyActiveUserSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["web", "app"],
      required: true,
    },
  },
  { timestamps: true },
);

// One record per user per day per platform
dailyActiveUserSchema.index({ userId: 1, date: 1, platform: 1 }, { unique: true });

const DailyActiveUser =
  models.DailyActiveUser || model("DailyActiveUser", dailyActiveUserSchema);

export default DailyActiveUser;
