import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

/**
 * Records the `jti` of every mobile checkout handoff token that has been redeemed,
 * so a stolen/leaked token cannot be replayed inside its 5-minute lifetime.
 * The document auto-expires (MongoDB TTL) once the token itself is already dead.
 */
const usedCheckoutTokenSchema = new Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // TTL: remove the row the moment its `expiresAt` passes.
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

export type UsedCheckoutTokenRecord = InferSchemaType<
  typeof usedCheckoutTokenSchema
>;
export type UsedCheckoutTokenDocument =
  HydratedDocument<UsedCheckoutTokenRecord>;

const UsedCheckoutTokenModel =
  models.UsedCheckoutToken ||
  model("UsedCheckoutToken", usedCheckoutTokenSchema);

export default UsedCheckoutTokenModel;
