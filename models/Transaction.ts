import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "CREDIT" | "DEBIT" | "WITHDRAWAL" | "SUBSCRIPTION_MANUAL";
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  
  // Manual Subscription Fields
  transactionId?: string;
  transactorName?: string;
  planSlug?: string;
  screenshotUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { 
      type: String, 
      enum: ["CREDIT", "DEBIT", "WITHDRAWAL", "SUBSCRIPTION_MANUAL"], 
      required: true 
    },
    amount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ["PENDING", "COMPLETED", "FAILED"], 
      required: true 
    },
    
    transactionId: { type: String },
    transactorName: { type: String },
    planSlug: { type: String },
    screenshotUrl: { type: String },
  },
  { timestamps: true }
);

// We deliberately avoid a strict `unique: true` index on `transactionId` here
// to allow our "Smart Typo Fix" and conflict resolution algorithms to handle 
// multiple PENDING claims appropriately.

export default mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
