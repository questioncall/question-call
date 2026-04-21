// Runtime const arrays — these stay here because they are values, not just types.
// Types are re-exported from types/question.ts for backward compatibility.

import type { AnswerFormat, BaseAnswerFormat, SelectableAnswerFormat } from "@/types/question";

export const BASE_ANSWER_FORMATS = ["TEXT", "PHOTO", "VIDEO"] as const;
export const ANSWER_FORMATS = [
  "ANY",
  "TEXT",
  "PHOTO",
  "VIDEO",
  "TEXT_PHOTO",
  "TEXT_VIDEO",
  "PHOTO_VIDEO",
  "TEXT_PHOTO_VIDEO",
] as const;
export const ANSWER_VISIBILITY_OPTIONS = ["PUBLIC", "PRIVATE"] as const;
export const QUESTION_STATUSES = ["OPEN", "ACCEPTED", "SOLVED", "RESET"] as const;
export const REACTION_TYPES = ["like", "insightful", "same_doubt"] as const;

const ANSWER_FORMAT_REQUIREMENTS: Record<AnswerFormat, BaseAnswerFormat[]> = {
  ANY: [],
  TEXT: ["TEXT"],
  PHOTO: ["PHOTO"],
  VIDEO: ["VIDEO"],
  TEXT_PHOTO: ["TEXT", "PHOTO"],
  TEXT_VIDEO: ["TEXT", "VIDEO"],
  PHOTO_VIDEO: ["PHOTO", "VIDEO"],
  TEXT_PHOTO_VIDEO: ["TEXT", "PHOTO", "VIDEO"],
};

const FORMAT_LABELS: Record<SelectableAnswerFormat, string> = {
  ANY: "Any",
  TEXT: "Text",
  PHOTO: "Photo",
  VIDEO: "Video",
};

export function getAnswerFormatRequirements(
  answerFormat: string | null | undefined,
): BaseAnswerFormat[] {
  if (!answerFormat) {
    return [];
  }

  return ANSWER_FORMAT_REQUIREMENTS[answerFormat as AnswerFormat] ?? [];
}

export function getSelectableFormatsFromAnswerFormat(
  answerFormat: string | null | undefined,
): SelectableAnswerFormat[] {
  const requirements = getAnswerFormatRequirements(answerFormat);
  return requirements.length === 0 ? ["ANY"] : requirements;
}

export function buildAnswerFormatFromSelection(
  selectedFormats: readonly string[],
): AnswerFormat {
  const selected = new Set<BaseAnswerFormat>();

  for (const format of selectedFormats) {
    if (
      (BASE_ANSWER_FORMATS as readonly string[]).includes(format)
    ) {
      selected.add(format as BaseAnswerFormat);
    }
  }

  const normalized = BASE_ANSWER_FORMATS.filter((format) => selected.has(format));

  if (normalized.length === 0) {
    return "ANY";
  }

  if (normalized.length === 1) {
    return normalized[0];
  }

  return normalized.join("_") as AnswerFormat;
}

export function toggleSelectableAnswerFormat(
  selectedFormats: readonly SelectableAnswerFormat[],
  nextFormat: SelectableAnswerFormat,
): SelectableAnswerFormat[] {
  if (nextFormat === "ANY") {
    return ["ANY"];
  }

  const current = new Set<BaseAnswerFormat>(
    selectedFormats.filter(
      (format): format is BaseAnswerFormat => format !== "ANY",
    ),
  );

  if (current.has(nextFormat)) {
    current.delete(nextFormat);
  } else {
    current.add(nextFormat);
  }

  const normalized = BASE_ANSWER_FORMATS.filter((format) => current.has(format));
  return normalized.length === 0 ? ["ANY"] : normalized;
}

export function getAnswerFormatLabel(answerFormat: string | null | undefined) {
  const requirements = getAnswerFormatRequirements(answerFormat);

  if (requirements.length === 0) {
    return FORMAT_LABELS.ANY;
  }

  return requirements.map((format) => FORMAT_LABELS[format]).join(" + ");
}

export function getPrimaryAnswerFormat(
  answerFormat: string | null | undefined,
): SelectableAnswerFormat {
  const requirements = getAnswerFormatRequirements(answerFormat);

  if (requirements.includes("VIDEO")) {
    return "VIDEO";
  }

  if (requirements.includes("PHOTO")) {
    return "PHOTO";
  }

  if (requirements.includes("TEXT")) {
    return "TEXT";
  }

  return "ANY";
}

export function hasMediaAnswerFormat(
  answerFormat: string | null | undefined,
) {
  const requirements = getAnswerFormatRequirements(answerFormat);
  return requirements.includes("PHOTO") || requirements.includes("VIDEO");
}

// Re-export types from the canonical location
export type {
  AnswerFormat,
  BaseAnswerFormat,
  SelectableAnswerFormat,
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
