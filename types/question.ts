// ──────────────────────────────────────────────────────────
// Shared question types — single source of truth
// ──────────────────────────────────────────────────────────

/** Answer formats */
export type AnswerFormat = "ANY" | "TEXT" | "PHOTO" | "VIDEO";

/** Who can see the answer */
export type AnswerVisibility = "PUBLIC" | "PRIVATE";

/** Lifecycle states */
export type QuestionStatus = "OPEN" | "ACCEPTED" | "SOLVED" | "RESET";

/** Reaction types available on feed questions */
export type ReactionType = "like" | "insightful" | "same_doubt";

/** A single reaction entry stored in the DB */
export type QuestionReaction = {
  userId: string;
  type: ReactionType;
};

// ──────────────────────────────────────────────────────────
// Record shapes
// ──────────────────────────────────────────────────────────

/** Shape returned when reading a question from the DB */
export type QuestionRecordShape = {
  id: string;
  askerId: string;
  title: string;
  body: string;
  images?: string[];
  answerFormat: AnswerFormat;
  answerVisibility: AnswerVisibility;
  status: QuestionStatus;
  subject?: string;
  stream?: string;
  level?: string;
  resetCount: number;
  reactions: QuestionReaction[];
  acceptedById?: string | null;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Extended shape used in the feed UI */
export type FeedQuestion = QuestionRecordShape & {
  askerName: string;
  askerUsername?: string;
  askerImage?: string;
  answerCount: number;
  reactionCount: number;
  acceptedByName?: string | null;
  previewAuthor?: string;
  previewText?: string;
  answer?: {
    content?: string;
    mediaUrls?: string[];
    answerFormat?: string;
    rating?: number | null;
    acceptorName?: string;
    submittedAt?: string;
  };
};

// ──────────────────────────────────────────────────────────
// Payloads
// ──────────────────────────────────────────────────────────

/** Body shape for POST /api/questions */
export type CreateQuestionPayload = {
  title: string;
  body: string;
  images?: string[];
  answerFormat: AnswerFormat;
  answerVisibility: AnswerVisibility;
  subject?: string;
  stream?: string;
  level?: string;
};

/** Body shape for POST /api/questions/[id]/accept */
export type AcceptQuestionPayload = {
  questionId: string;
};

/** Body shape for POST /api/questions/[id]/react */
export type ReactToQuestionPayload = {
  type: ReactionType;
};
