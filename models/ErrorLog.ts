import mongoose, { Schema, Document } from "mongoose";

export interface IErrorLog extends Document {
  errorKey: string;
  message: string;
  stack?: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

const errorLogSchema = new Schema<IErrorLog>({
  errorKey: {
    type: String,
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  stack: {
    type: String,
  },
  count: {
    type: Number,
    default: 1,
    min: 1,
  },
  firstOccurred: {
    type: Date,
    default: Date.now,
  },
  lastOccurred: {
    type: Date,
    default: Date.now,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedAt: {
    type: Date,
  },
});

errorLogSchema.index({ errorKey: 1, resolved: 1 });

export default mongoose.models.ErrorLog ||
  mongoose.model<IErrorLog>("ErrorLog", errorLogSchema);