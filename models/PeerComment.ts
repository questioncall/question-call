import { HydratedDocument, InferSchemaType, Schema, model, models } from "mongoose";

const peerCommentSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    /** Null until it gets evaluated in a batch. Then assigned a milestone group number */
    milestoneGroup: {
      type: Number,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find ALL unique questions a student has commented on
peerCommentSchema.index({ studentId: 1, questionId: 1 });

export type PeerCommentRecord = InferSchemaType<typeof peerCommentSchema>;
export type PeerCommentDocument = HydratedDocument<PeerCommentRecord>;

const PeerComment = models.PeerComment || model("PeerComment", peerCommentSchema);

export default PeerComment;
