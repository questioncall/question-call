import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const withdrawalRequestSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** How many points teacher wants to withdraw */
    pointsRequested: {
      type: Number,
      required: true,
      min: 0.01,
    },
    /** pointsRequested × pointToNprRate at time of request (locked) */
    nprEquivalent: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Teacher's eSewa phone number */
    esewaNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    /** Whether the requester balance was already held when the request was created */
    pointsReserved: {
      type: Boolean,
      default: false,
    },

    // ─── Admin-filled fields (null until admin processes) ────────
    /** eSewa transaction ID from admin's eSewa app */
    transactionId: {
      type: String,
      default: null,
    },
    /** Actual NPR sent (should match nprEquivalent) */
    amountSent: {
      type: Number,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    /** Admin's user ID who processed this */
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /** Admin note, e.g. "Sent via eSewa personal account" */
    adminNote: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Only one pending withdrawal should exist per user at a time.
withdrawalRequestSchema.index(
  { teacherId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" },
  },
);

export type WithdrawalRequestRecord = InferSchemaType<typeof withdrawalRequestSchema>;
export type WithdrawalRequestDocument = HydratedDocument<WithdrawalRequestRecord>;

const WithdrawalRequest =
  models.WithdrawalRequest || model("WithdrawalRequest", withdrawalRequestSchema);

export default WithdrawalRequest;
