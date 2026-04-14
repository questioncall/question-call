import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVerificationToken extends Document {
  email: string;
  code: string;
  expiresAt: Date;
}

const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "10m" }, // Automatically TTL deletes document after 10 minutes from creation
    },
  },
  { timestamps: true }
);

const VerificationToken: Model<IVerificationToken> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>("VerificationToken", VerificationTokenSchema);

export default VerificationToken;
