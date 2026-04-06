import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["STUDENT", "TEACHER", "ADMIN"],
      required: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscriptionStatus: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "EXPIRED"],
      default: "TRIAL",
    },
    subscriptionEnd: {
      type: Date,
      default: null,
    },
    trialUsed: {
      type: Boolean,
      default: false,
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAnswered: {
      type: Number,
      default: 0,
      min: 0,
    },
    isMonetized: {
      type: Boolean,
      default: false,
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

export type UserRecord = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserRecord>;

const User = models.User || model("User", userSchema);

export default User;
