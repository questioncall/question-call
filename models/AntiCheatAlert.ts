import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const antiCheatAlertSchema = new Schema(
  {
    teacherId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true,
    },
    studentId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true,
    },
    consecutiveCount: { 
      type: Number, 
      required: true 
    },
    status: { 
      type: String, 
      enum: ["WARNING", "SUSPENDED"], 
      default: "WARNING" 
    },
    resolvedAt: { 
      type: Date, 
      default: null 
    },
  }, 
  { 
    timestamps: true 
  }
);

export type AntiCheatAlertRecord = InferSchemaType<typeof antiCheatAlertSchema>;
export type AntiCheatAlertDocument = HydratedDocument<AntiCheatAlertRecord>;

const AntiCheatAlert = models.AntiCheatAlert || model("AntiCheatAlert", antiCheatAlertSchema);

export default AntiCheatAlert;
