import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const apiRequestLogSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    versionKey: false,
  },
);

apiRequestLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ApiRequestLogRecord = InferSchemaType<typeof apiRequestLogSchema>;
export type ApiRequestLogDocument = HydratedDocument<ApiRequestLogRecord>;

const ApiRequestLog =
  models.ApiRequestLog || model("ApiRequestLog", apiRequestLogSchema);

export default ApiRequestLog;
