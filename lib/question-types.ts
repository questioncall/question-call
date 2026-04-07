// Runtime const arrays — these stay here because they are values, not just types.
// Types are re-exported from types/question.ts for backward compatibility.

export const QUESTION_TIERS = ["UNSET", "ONE", "TWO", "THREE"] as const;
export const ANSWER_VISIBILITY_OPTIONS = ["PUBLIC", "PRIVATE"] as const;
export const QUESTION_STATUSES = ["OPEN", "ACCEPTED", "SOLVED", "RESET"] as const;
export const REACTION_TYPES = ["like", "insightful", "same_doubt"] as const;

// Re-export types from the canonical location
export type {
  QuestionTier,
  AnswerVisibility,
  QuestionStatus,
  ReactionType,
  QuestionReaction,
  QuestionRecordShape,
  FeedQuestion,
  CreateQuestionPayload,
  AcceptQuestionPayload,
  ReactToQuestionPayload,
} from "@/types/question";
