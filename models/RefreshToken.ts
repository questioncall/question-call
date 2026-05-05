import {
  HydratedDocument,
  InferSchemaType,
  Schema,
  model,
  models,
} from "mongoose";

const refreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
    },
  },
  {
    timestamps: true,
  },
);

export type RefreshTokenRecord = InferSchemaType<typeof refreshTokenSchema>;
export type RefreshTokenDocument = HydratedDocument<RefreshTokenRecord>;

const RefreshTokenModel =
  models.RefreshToken || model("RefreshToken", refreshTokenSchema);

export default RefreshTokenModel;
