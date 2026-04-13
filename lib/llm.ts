import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import Groq from "groq-sdk";

import { connectToDatabase } from "@/lib/mongodb";
import {
  normalizeQuizAliases,
  normalizeQuizField,
  normalizeQuizLevel,
  normalizeQuizText,
} from "@/lib/quiz-topic-utils";
import AIProviderConfig, {
  AIKeySlot,
  IAIProviderConfig,
} from "@/models/AIProviderConfig";

const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const PROVIDERS = ["gemini", "groq", "openrouter", "mistral", "cerebras"] as const;

type ProviderName = (typeof PROVIDERS)[number];
type ChatMessage = {
  role: "system" | "user";
  content: string;
};
type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export type GeneratedQuizQuestion = {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string | null;
};

export type SuggestedQuizTopicPlan = {
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  searchAliases?: string[];
  questionCount: number;
};

export interface LLMOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

export class LLMExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMExhaustedError";
  }
}

const VALID_JSON_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

let cachedConfig: IAIProviderConfig | null = null;
let cacheFetchedAt = 0;
const CACHE_TTL = 60 * 1000;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isProviderName(value: string): value is ProviderName {
  return PROVIDERS.includes(value as ProviderName);
}

function getProviderSlots(
  config: IAIProviderConfig,
  provider: ProviderName,
): AIKeySlot[] {
  return config[provider];
}

async function getConfig(): Promise<IAIProviderConfig> {
  const now = Date.now();

  if (cachedConfig && now - cacheFetchedAt < CACHE_TTL) {
    return cachedConfig;
  }

  await connectToDatabase();
  const config = await AIProviderConfig.getSingleton();
  cachedConfig = config;
  cacheFetchedAt = now;
  return config;
}

function getNextMidnightUTC(): Date {
  const date = new Date();
  date.setUTCHours(24, 0, 0, 0);
  return date;
}

async function markKeyExhausted(provider: ProviderName, keyIndex: number) {
  const config = await getConfig();
  const providerArray = getProviderSlots(config, provider);

  if (!providerArray[keyIndex]) {
    return;
  }

  providerArray[keyIndex].isExhausted = true;
  providerArray[keyIndex].exhaustedAt = new Date();
  providerArray[keyIndex].resetAt = getNextMidnightUTC();
  await config.save();
  cachedConfig = config;
}

async function markKeyUsed(provider: ProviderName, keyIndex: number) {
  const config = await getConfig();
  const providerArray = getProviderSlots(config, provider);

  if (!providerArray[keyIndex]) {
    return;
  }

  providerArray[keyIndex].lastUsedAt = new Date();
  await config.save();
  cachedConfig = config;
}

async function autoResetKeys(config: IAIProviderConfig): Promise<boolean> {
  let updated = false;
  const now = new Date();

  for (const provider of PROVIDERS) {
    const keys = getProviderSlots(config, provider);

    for (const key of keys) {
      if (key.isExhausted && key.resetAt && now >= key.resetAt) {
        key.isExhausted = false;
        key.exhaustedAt = undefined;
        key.resetAt = undefined;
        updated = true;
      }
    }
  }

  if (updated) {
    await config.save();
    cachedConfig = config;
  }

  return updated;
}

async function runGemini(
  key: string,
  prompt: string,
  opts: LLMOptions,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const fullPrompt = opts.systemPrompt
    ? `System Instruction:\n${opts.systemPrompt}\n\nUser Request:\n${prompt}`
    : prompt;
  const result = await model.generateContent(
    opts.json ? `${fullPrompt}\nRespond ONLY in valid JSON.` : fullPrompt,
  );

  return result.response.text();
}

async function runGroq(
  key: string,
  prompt: string,
  opts: LLMOptions,
): Promise<string> {
  const groq = new Groq({ apiKey: key });
  const messages: ChatMessage[] = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  const finalPrompt = opts.json ? `${prompt}\nRespond ONLY in valid JSON.` : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const completion = await groq.chat.completions.create({
    messages,
    model: "llama-3.1-8b-instant",
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
  });

  return completion.choices[0]?.message?.content || "";
}

async function runMistral(
  key: string,
  prompt: string,
  opts: LLMOptions,
): Promise<string> {
  const mistral = new Mistral({ apiKey: key });
  const messages: ChatMessage[] = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  const finalPrompt = opts.json ? `${prompt}\nRespond ONLY in valid JSON.` : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const response = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages,
    temperature: opts.temperature ?? 0.7,
    maxTokens: opts.maxTokens ?? 1024,
  });

  return (response.choices?.[0]?.message?.content as string) || "";
}

async function runOpenRouter(
  key: string,
  prompt: string,
  opts: LLMOptions,
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  const finalPrompt = opts.json ? `${prompt}\nRespond ONLY in valid JSON.` : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct:free",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter HTTP ${res.status}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content || "";
}

async function runCerebras(
  key: string,
  prompt: string,
  opts: LLMOptions,
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  const finalPrompt = opts.json ? `${prompt}\nRespond ONLY in valid JSON.` : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama3.1-8b",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    throw new Error(`Cerebras HTTP ${res.status}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content || "";
}

async function executeAttempt(prompt: string, opts: LLMOptions = {}): Promise<string> {
  const config = await getConfig();
  await autoResetKeys(config);

  const configuredProviders = config.providerOrder.filter(isProviderName);
  let sawTransientFailure = false;
  let lastErrorMessage = "";

  for (const provider of configuredProviders) {
    const keys = getProviderSlots(config, provider);

    if (keys.length === 0) {
      continue;
    }

    for (let i = 0; i < keys.length; i++) {
      const keyObj = keys[i];

      if (keyObj.isExhausted) {
        continue;
      }

      try {
        let result = "";

        if (provider === "gemini") {
          result = await runGemini(keyObj.key, prompt, opts);
        } else if (provider === "groq") {
          result = await runGroq(keyObj.key, prompt, opts);
        } else if (provider === "mistral") {
          result = await runMistral(keyObj.key, prompt, opts);
        } else if (provider === "openrouter") {
          result = await runOpenRouter(keyObj.key, prompt, opts);
        } else if (provider === "cerebras") {
          result = await runCerebras(keyObj.key, prompt, opts);
        }

        await markKeyUsed(provider, i);
        return result;
      } catch (error) {
        const message = getErrorMessage(error);
        lastErrorMessage = message;
        console.error(`[LLM ${provider} key ${i} Error]`, message);

        const isQuotaHit =
          message.includes("429") ||
          message.includes("403") ||
          message.includes("quota") ||
          message.includes("rate limit") ||
          message.includes("Too Many Requests");

        if (isQuotaHit) {
          await markKeyExhausted(provider, i);
        } else {
          sawTransientFailure = true;
        }
      }
    }
  }

  if (sawTransientFailure) {
    throw new Error(lastErrorMessage || "AI providers failed temporarily.");
  }

  throw new LLMExhaustedError("All AI providers and keys are currently exhausted or failing.");
}

export async function llmGenerate(
  prompt: string,
  opts: LLMOptions = {},
): Promise<string> {
  try {
    return await executeAttempt(prompt, opts);
  } catch (error) {
    console.error("[llmGenerate Primary Failure]", getErrorMessage(error));

    try {
      if (error instanceof LLMExhaustedError) {
        console.warn("[llmGenerate] All providers exhausted, returning empty data fallback.");
        return "";
      }

      console.warn("[llmGenerate] Retrying one more time...");
      return await executeAttempt(prompt, opts);
    } catch (retryError) {
      console.error("[llmGenerate Retry Failure - Final]", retryError);
      return "";
    }
  }
}

function extractJsonPayload(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  return trimmed;
}

function sanitizeJsonPayload(raw: string) {
  const normalized = raw
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'");

  let result = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const code = normalized.charCodeAt(index);

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += char;
        continue;
      }

      if (code < 0x20 && char !== "\n" && char !== "\r" && char !== "\t") {
        continue;
      }

      result += char;
      continue;
    }

    if (escaping) {
      if (VALID_JSON_ESCAPES.has(char)) {
        result += char;
      } else if (char === "\n") {
        result += "n";
      } else if (char === "\r") {
        result += "r";
      } else if (char === "\t") {
        result += "t";
      } else {
        result += `\\${char}`;
      }

      escaping = false;
      continue;
    }

    if (char === "\\") {
      result += "\\";
      escaping = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = false;
      continue;
    }

    if (char === "\n") {
      result += "\\n";
      continue;
    }

    if (char === "\r") {
      result += "\\r";
      continue;
    }

    if (char === "\t") {
      result += "\\t";
      continue;
    }

    if (char === "\b") {
      result += "\\b";
      continue;
    }

    if (char === "\f") {
      result += "\\f";
      continue;
    }

    if (code < 0x20) {
      result += " ";
      continue;
    }

    result += char;
  }

  return result;
}

function parseModelJson<T>(raw: string, label: string): T | null {
  const extracted = extractJsonPayload(raw);

  if (!extracted) {
    return null;
  }

  try {
    return JSON.parse(extracted) as T;
  } catch (firstError) {
    try {
      return JSON.parse(sanitizeJsonPayload(extracted)) as T;
    } catch (secondError) {
      console.error(`[${label}] Failed to parse JSON response`, firstError);
      console.error(`[${label}] Failed to parse sanitized JSON response`, secondError);
      return null;
    }
  }
}

function normalizeGeneratedQuizQuestions(raw: string): GeneratedQuizQuestion[] {
  const payload = parseModelJson<unknown[]>(raw, "generateQuizQuestions");
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((item): GeneratedQuizQuestion[] => {
      const itemObj = item as Record<string, unknown>;
      const questionText =
        typeof itemObj?.questionText === "string" ? String(itemObj.questionText).trim() : "";
      const options = Array.isArray(itemObj?.options)
        ? itemObj.options
            .map((option: unknown) =>
              typeof option === "string" ? String(option).trim() : "",
            )
            .filter(Boolean)
        : [];
      const correctOptionIndex =
        typeof itemObj?.correctOptionIndex === "number"
          ? Number(itemObj.correctOptionIndex)
          : -1;
      const explanation =
        typeof itemObj?.explanation === "string"
          ? String(itemObj.explanation).trim()
          : null;

      if (!questionText || options.length !== 4 || correctOptionIndex < 0 || correctOptionIndex > 3) {
        return [];
      }

      return [{
        questionText,
        options,
        correctOptionIndex,
        explanation,
      }];
    });
}

function normalizeSuggestedQuizTopicPlans(
  raw: string,
  totalQuestions: number,
  maxTopics: number,
) {
  const payload = parseModelJson<unknown[]>(raw, "suggestQuizTopicPlans");
  if (!Array.isArray(payload)) {
    return [];
  }

  const plans = payload.flatMap((item): SuggestedQuizTopicPlan[] => {
    const itemObj = item as Record<string, unknown>;
    const subject =
      typeof itemObj?.subject === "string" ? normalizeQuizText(String(itemObj.subject)) : "";
    const topic =
      typeof itemObj?.topic === "string" ? normalizeQuizText(String(itemObj.topic)) : "";
    const field =
      typeof itemObj?.field === "string" ? normalizeQuizField(String(itemObj.field)) : null;
    const rawLevel =
      typeof itemObj?.level === "string" ? String(itemObj.level) : "";
    const level = rawLevel ? normalizeQuizLevel(rawLevel, field) : "";
    const questionCount =
      typeof itemObj?.questionCount === "number"
        ? Math.max(1, Math.floor(Number(itemObj.questionCount)))
        : 1;
    const searchAliases = normalizeQuizAliases(itemObj?.searchAliases as string[] | undefined);

    if (!subject || !topic || !level) {
      return [];
    }

    return [
      {
        subject,
        topic,
        level,
        field,
        searchAliases,
        questionCount,
      },
    ];
  });

  if (plans.length === 0) {
    return [];
  }

  const limitedPlans = plans.slice(0, Math.max(1, Math.min(maxTopics, totalQuestions)));
  const sourceTotal = limitedPlans.reduce((sum, item) => sum + item.questionCount, 0) || 1;
  let remaining = Math.max(1, totalQuestions);

  return limitedPlans.map((plan, index) => {
    const remainingPlans = limitedPlans.length - index - 1;
    const proportional = Math.max(
      1,
      Math.round((plan.questionCount / sourceTotal) * totalQuestions),
    );
    const assigned =
      index === limitedPlans.length - 1
        ? remaining
        : Math.max(1, Math.min(proportional, remaining - remainingPlans));

    remaining -= assigned;

    return {
      ...plan,
      questionCount: assigned,
    };
  });
}

export async function generateQuizQuestions(input: {
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  count: number;
}): Promise<GeneratedQuizQuestion[]> {
  const prompt = [
    `Generate ${input.count} multiple-choice quiz questions for the following academic context.`,
    `Subject: ${input.subject}`,
    `Topic: ${input.topic}`,
    `Level: ${input.level}`,
    input.field ? `Field / Stream: ${input.field}` : null,
    "",
    "Return a JSON array only.",
    "Each item must have this exact shape:",
    '{ "questionText": string, "options": [string, string, string, string], "correctOptionIndex": 0-3, "explanation": string }',
    "",
    "Rules:",
    "- Questions must be academically accurate and suitable for the stated level.",
    "- Avoid duplicate questions or near-duplicate options.",
    "- Exactly four answer options per question.",
    "- Only one option can be correct.",
    "- Keep explanations concise and helpful.",
    "- Escape quotes, backslashes, tabs, and line breaks inside JSON strings.",
    "- Do not wrap the response in markdown unless required by the model.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await llmGenerate(prompt, {
    systemPrompt:
      "You generate strict academic quiz JSON for a student practice platform. Respond with valid JSON only.",
    json: true,
    temperature: 0.6,
    maxTokens: Math.max(1600, input.count * 280),
  });

  return normalizeGeneratedQuizQuestions(raw).slice(0, input.count);
}

export async function suggestQuizTopicPlans(input: {
  prompt: string;
  totalQuestions: number;
  maxTopics: number;
}) {
  const prompt = [
    "Plan quiz-bank seeding for a Nepal-focused academic practice platform.",
    input.prompt
      ? `Admin request: ${input.prompt}`
      : "Admin request: Create a balanced starter seed batch.",
    `Return up to ${input.maxTopics} topic plans.`,
    `The combined questionCount across all plans should total ${input.totalQuestions}.`,
    "",
    "Use realistic academic taxonomy such as:",
    "- Class 5 to Class 10",
    "- Plus 2 - Science / Management / Law / Humanities / Education / Hotel Management / Computer Science",
    "- Bachelor - BBS / BBA / BCA / BSc CSIT / BIT / LLB / Engineering / Nursing / other fields when relevant",
    "",
    "Return a JSON array only.",
    'Each item must be: { "subject": string, "topic": string, "level": string, "field": string | null, "searchAliases": string[], "questionCount": number }',
    "",
    "Rules:",
    "- Keep topics distinct but closely related to the admin request.",
    "- Use academically sensible subjects, topics, and levels.",
    "- Prefer broad, searchable labels students will understand.",
    "- searchAliases should include short related search terms or nearby fields when helpful.",
    "- Escape quotes, backslashes, tabs, and line breaks inside JSON strings.",
    "- Do not include explanations, markdown, or extra keys.",
  ].join("\n");

  const raw = await llmGenerate(prompt, {
    systemPrompt:
      "You design structured quiz-bank seeding plans for an academic platform. Respond with valid JSON only.",
    json: true,
    temperature: 0.4,
    maxTokens: Math.max(1600, input.maxTopics * 220),
  });

  return normalizeSuggestedQuizTopicPlans(raw, input.totalQuestions, input.maxTopics);
}
