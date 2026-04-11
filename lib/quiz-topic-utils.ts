export type QuizLevelCategory = "SCHOOL" | "PLUS_TWO" | "BACHELOR" | "OTHER";

export type QuizTopicLike = {
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  searchAliases?: string[];
  questionCount?: number;
};

export type QuizTopicSearchResult<T extends QuizTopicLike> = T & {
  field: string | null;
  level: string;
  levelCategory: QuizLevelCategory;
  searchScore: number;
  matchReason: string | null;
};

const QUIZ_FIELD_ALIASES: Array<{ label: string; aliases: string[] }> = [
  { label: "Science", aliases: ["science", "sci"] },
  { label: "Management", aliases: ["management", "mgmt", "commerce"] },
  { label: "Law", aliases: ["law", "legal"] },
  { label: "Humanities", aliases: ["humanities", "arts"] },
  { label: "Education", aliases: ["education", "edu"] },
  { label: "Computer Science", aliases: ["computer science", "cs", "computing"] },
  { label: "Hotel Management", aliases: ["hotel management", "hm", "hospitality"] },
  { label: "Nursing", aliases: ["nursing"] },
  { label: "BSc CSIT", aliases: ["bsc csit", "csit"] },
  { label: "BCA", aliases: ["bca"] },
  { label: "BBS", aliases: ["bbs"] },
  { label: "BBA", aliases: ["bba"] },
  { label: "BIT", aliases: ["bit"] },
  { label: "LLB", aliases: ["llb"] },
  { label: "Civil Engineering", aliases: ["civil engineering", "be civil", "b.e. civil"] },
  {
    label: "Computer Engineering",
    aliases: ["computer engineering", "be computer", "b.e. computer"],
  },
];

const CATEGORY_HINTS: Record<QuizLevelCategory, string[]> = {
  SCHOOL: ["class", "grade", "school", "5", "6", "7", "8", "9", "10"],
  PLUS_TWO: ["+2", "plus 2", "11", "12", "intermediate", "higher secondary"],
  BACHELOR: ["bachelor", "bachelors", "undergraduate", "college", "campus"],
  OTHER: [],
};

function uniqueNormalized(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalizeQuizText(value);
    const signature = normalized.toLowerCase();

    if (!normalized || seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    output.push(normalized);
  }

  return output;
}

function toTitleCase(value: string) {
  return normalizeQuizText(value)
    .split(" ")
    .map((token) => {
      if (!token) {
        return token;
      }

      if (/^[A-Z0-9+.-]+$/.test(token)) {
        return token;
      }

      return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function tokenize(value: string) {
  return normalizeQuizText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function findKnownFieldLabel(value: string) {
  const normalized = normalizeQuizText(value).toLowerCase();

  for (const entry of QUIZ_FIELD_ALIASES) {
    if (entry.aliases.some((alias) => normalized.includes(alias))) {
      return entry.label;
    }
  }

  return null;
}

export function normalizeQuizText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function inferQuizLevelCategory(level: string): QuizLevelCategory {
  const normalized = normalizeQuizText(level).toLowerCase();

  if (/(?:class|grade)\s*(5|6|7|8|9|10)\b/.test(normalized) || /^[5-9]$/.test(normalized) || normalized === "10") {
    return "SCHOOL";
  }

  if (
    normalized.includes("+2") ||
    normalized.includes("plus 2") ||
    /\b(class|grade)\s*(11|12)\b/.test(normalized) ||
    normalized.includes("higher secondary")
  ) {
    return "PLUS_TWO";
  }

  if (
    normalized.includes("bachelor") ||
    normalized.includes("undergraduate") ||
    /\b(bca|bbs|bba|bit|llb|be|bsc)\b/.test(normalized)
  ) {
    return "BACHELOR";
  }

  return "OTHER";
}

export function inferQuizFieldFromLevel(level: string) {
  const normalized = normalizeQuizText(level);
  const knownField = findKnownFieldLabel(normalized);

  if (knownField) {
    return knownField;
  }

  const hyphenSplit = normalized.split(/\s*[-:]\s*/).map((item) => item.trim());
  if (hyphenSplit.length >= 2) {
    const trailing = hyphenSplit.slice(1).join(" ").trim();
    if (trailing) {
      return toTitleCase(trailing);
    }
  }

  return null;
}

export function normalizeQuizField(field?: string | null) {
  const normalized = normalizeQuizText(field ?? "");

  if (!normalized) {
    return null;
  }

  return findKnownFieldLabel(normalized) ?? toTitleCase(normalized);
}

export function normalizeQuizLevel(level: string, field?: string | null) {
  const normalized = normalizeQuizText(level);
  const normalizedField = normalizeQuizField(field) ?? inferQuizFieldFromLevel(normalized);

  const schoolMatch =
    normalized.match(/(?:class|grade)\s*(5|6|7|8|9|10)\b/i) ??
    normalized.match(/^(5|6|7|8|9|10)$/);

  if (schoolMatch?.[1]) {
    return `Class ${schoolMatch[1]}`;
  }

  if (
    normalized.includes("+2") ||
    normalized.toLowerCase().includes("plus 2") ||
    /\b(class|grade)\s*(11|12)\b/i.test(normalized)
  ) {
    return normalizedField ? `Plus 2 - ${normalizedField}` : "Plus 2";
  }

  if (
    normalized.toLowerCase().includes("bachelor") ||
    normalized.toLowerCase().includes("undergraduate") ||
    /\b(bca|bbs|bba|bit|llb|be|bsc)\b/i.test(normalized)
  ) {
    return normalizedField ? `Bachelor - ${normalizedField}` : "Bachelor";
  }

  return toTitleCase(normalized);
}

export function normalizeQuizAliases(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return uniqueNormalized(
    values.flatMap((value) => (typeof value === "string" ? [value] : [])),
  ).slice(0, 12);
}

export function resolveQuizTopicMetadata<T extends QuizTopicLike>(topic: T) {
  const field = normalizeQuizField(topic.field) ?? inferQuizFieldFromLevel(topic.level);
  const level = normalizeQuizLevel(topic.level, field);
  const searchAliases = normalizeQuizAliases(topic.searchAliases);

  return {
    ...topic,
    field,
    level,
    levelCategory: inferQuizLevelCategory(level),
    searchAliases,
  };
}

function detectQueryCategories(queryTokens: string[]) {
  const joined = queryTokens.join(" ");
  const categories = new Set<QuizLevelCategory>();

  for (const [category, hints] of Object.entries(CATEGORY_HINTS) as Array<
    [QuizLevelCategory, string[]]
  >) {
    if (hints.some((hint) => joined.includes(hint))) {
      categories.add(category);
    }
  }

  return categories;
}

function buildMatchReason(matchedFields: string[]) {
  const uniqueFields = [...new Set(matchedFields)];

  if (uniqueFields.length === 0) {
    return null;
  }

  if (uniqueFields.length === 1) {
    return `Matched ${uniqueFields[0]}.`;
  }

  if (uniqueFields.length === 2) {
    return `Matched ${uniqueFields[0]} and ${uniqueFields[1]}.`;
  }

  return `Matched ${uniqueFields.slice(0, 3).join(", ")}.`;
}

export function searchQuizTopics<T extends QuizTopicLike>(
  topics: T[],
  query: string,
  limit = 24,
) {
  const normalizedQuery = normalizeQuizText(query).toLowerCase();

  if (!normalizedQuery) {
    return topics
      .map((topic) => ({
        ...resolveQuizTopicMetadata(topic),
        searchScore: 1,
        matchReason: null,
      }))
      .sort((left, right) => {
        return (
          (right.questionCount ?? 0) - (left.questionCount ?? 0) ||
          left.subject.localeCompare(right.subject) ||
          left.topic.localeCompare(right.topic) ||
          left.level.localeCompare(right.level)
        );
      })
      .slice(0, limit);
  }

  const queryTokens = tokenize(normalizedQuery);
  const queryCategories = detectQueryCategories(queryTokens);

  return topics
    .map((topic) => {
      const metadata = resolveQuizTopicMetadata(topic);
      const subject = metadata.subject.toLowerCase();
      const topicName = metadata.topic.toLowerCase();
      const level = metadata.level.toLowerCase();
      const field = (metadata.field ?? "").toLowerCase();
      const aliasText = metadata.searchAliases.join(" ").toLowerCase();
      const haystack = [subject, topicName, level, field, aliasText].filter(Boolean).join(" ");

      let searchScore = 0;
      const matchedFields: string[] = [];

      if (subject === normalizedQuery) {
        searchScore += 150;
        matchedFields.push("subject");
      }

      if (topicName === normalizedQuery) {
        searchScore += 145;
        matchedFields.push("topic");
      }

      if (level === normalizedQuery) {
        searchScore += 140;
        matchedFields.push("level");
      }

      if (field && field === normalizedQuery) {
        searchScore += 140;
        matchedFields.push("field");
      }

      if (haystack.includes(normalizedQuery)) {
        searchScore += 60;
      }

      for (const token of queryTokens) {
        if (subject.includes(token)) {
          searchScore += 24;
          matchedFields.push("subject");
        }

        if (topicName.includes(token)) {
          searchScore += 22;
          matchedFields.push("topic");
        }

        if (level.includes(token)) {
          searchScore += 20;
          matchedFields.push("level");
        }

        if (field.includes(token)) {
          searchScore += 18;
          matchedFields.push("field");
        }

        if (aliasText.includes(token)) {
          searchScore += 14;
          matchedFields.push("related field");
        }
      }

      if (queryCategories.has(metadata.levelCategory)) {
        searchScore += 26;
        matchedFields.push("level");
      }

      return {
        ...metadata,
        searchScore,
        matchReason: buildMatchReason(matchedFields),
      };
    })
    .filter((topic) => topic.searchScore > 0)
    .sort((left, right) => {
      return (
        right.searchScore - left.searchScore ||
        (right.questionCount ?? 0) - (left.questionCount ?? 0) ||
        left.subject.localeCompare(right.subject) ||
        left.topic.localeCompare(right.topic) ||
        left.level.localeCompare(right.level)
      );
    })
    .slice(0, limit);
}

export function buildQuizTopicSuggestions<T extends QuizTopicLike>(topics: T[]) {
  const subjects = uniqueNormalized(topics.map((topic) => topic.subject)).slice(0, 10);
  const levels = uniqueNormalized(
    topics.map((topic) => resolveQuizTopicMetadata(topic).level),
  ).slice(0, 10);
  const fields = uniqueNormalized(
    topics.flatMap((topic) => {
      const metadata = resolveQuizTopicMetadata(topic);
      return metadata.field ? [metadata.field] : [];
    }),
  ).slice(0, 10);

  return { subjects, levels, fields };
}
