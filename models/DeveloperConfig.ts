import mongoose, { Schema, Document } from "mongoose";

export interface IDeveloperConfig extends Document {
  emails: string[];
  errorThreshold: number;
  enabled: boolean;
  lastAlertSent: Date | null;
}

const developerConfigSchema = new Schema<IDeveloperConfig>({
  emails: {
    type: [String],
    default: [],
    lowercase: true,
  },
  errorThreshold: {
    type: Number,
    default: 4,
    min: 1,
    max: 100,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  lastAlertSent: {
    type: Date,
    default: null,
  },
});

developerConfigSchema.statics.getSingleton = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

export default mongoose.models.DeveloperConfig ||
  mongoose.model<IDeveloperConfig>("DeveloperConfig", developerConfigSchema);