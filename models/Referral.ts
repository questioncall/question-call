import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const referralSchema = new Schema(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refereeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One referee can only be referred once
    },
    referralCode: {
      type: String,
      required: true,
    },
    bonusAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["COMPLETED", "REVOKED"],
      default: "COMPLETED",
    },
  },
  {
    timestamps: true,
  },
);

export type ReferralRecord = InferSchemaType<typeof referralSchema>;
export type ReferralDocument = HydratedDocument<ReferralRecord>;

const Referral = models.Referral || model("Referral", referralSchema);

export default Referral;
