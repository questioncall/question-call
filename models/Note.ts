import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

export const NOTE_FILE_TYPES = ["PDF", "DOCX", "PPT", "Image"] as const;

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    fileType: {
      type: String,
      enum: NOTE_FILE_TYPES,
      required: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ subject: 1, createdAt: -1 });
noteSchema.index({ uploaderId: 1, createdAt: -1 });
noteSchema.index({ title: "text", description: "text" });

export type NoteRecord = InferSchemaType<typeof noteSchema>;
export type NoteDocument = HydratedDocument<NoteRecord>;

const Note = models.Note || model("Note", noteSchema);

export default Note;
