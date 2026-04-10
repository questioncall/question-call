import mongoose, { Schema, Document, Model } from "mongoose";

export interface AIKeySlot {
  key: string;
  label?: string;
  isExhausted: boolean;
  exhaustedAt?: Date;
  resetAt?: Date;
  lastUsedAt?: Date;
}

export interface IAIProviderConfig extends Document {
  gemini: AIKeySlot[];
  groq: AIKeySlot[];
  openrouter: AIKeySlot[];
  mistral: AIKeySlot[];
  cerebras: AIKeySlot[];
  providerOrder: string[];
  updatedAt: Date;
}

const AIKeySlotSchema = new Schema<AIKeySlot>({
  key: { type: String, required: true },
  label: { type: String },
  isExhausted: { type: Boolean, default: false },
  exhaustedAt: { type: Date },
  resetAt: { type: Date },
  lastUsedAt: { type: Date },
});

const AIProviderConfigSchema = new Schema<IAIProviderConfig>(
  {
    gemini: { type: [AIKeySlotSchema], default: [] },
    groq: { type: [AIKeySlotSchema], default: [] },
    openrouter: { type: [AIKeySlotSchema], default: [] },
    mistral: { type: [AIKeySlotSchema], default: [] },
    cerebras: { type: [AIKeySlotSchema], default: [] },
    providerOrder: {
      type: [String],
      default: ["gemini", "groq", "openrouter", "mistral", "cerebras"],
    },
  },
  { timestamps: true }
);

// We need a helper to safely get the singleton document and create it if memory is blank
AIProviderConfigSchema.statics.getSingleton = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

// Interface augmentation to include the static method
export interface AIProviderConfigModel extends Model<IAIProviderConfig> {
  getSingleton(): Promise<IAIProviderConfig>;
}

export default (mongoose.models.AIProviderConfig as AIProviderConfigModel) ||
  mongoose.model<IAIProviderConfig, AIProviderConfigModel>("AIProviderConfig", AIProviderConfigSchema);
