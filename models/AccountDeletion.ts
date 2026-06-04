import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

/**
 * Audit log of self-service account deletions. One row is created when a user
 * deletes their account (app/api/account DELETE). The name/email/role are
 * snapshotted here so the admin log still shows who deleted even after the
 * User record is anonymized at the end of the 30-day recovery window.
 *
 * status transitions:
 *   pending   → just deleted, still inside the recovery window
 *   recovered → user restored the account via Forgot Password
 *   purged    → recovery window elapsed, User record permanently anonymized
 */
const accountDeletionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    role: { type: String, default: "" },
    reason: { type: String, default: "" },
    deletedAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "recovered", "purged"],
      default: "pending",
      index: true,
    },
    recoveredAt: { type: Date, default: null },
    purgedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export type AccountDeletionRecord = InferSchemaType<
  typeof accountDeletionSchema
>;
export type AccountDeletionDocument =
  HydratedDocument<AccountDeletionRecord>;

const AccountDeletion =
  models.AccountDeletion ||
  model("AccountDeletion", accountDeletionSchema);

export default AccountDeletion;
