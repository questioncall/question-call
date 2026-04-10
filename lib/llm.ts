import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import Groq from "groq-sdk";

import { connectToDatabase } from "@/lib/mongodb";
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
        console.error(`[LLM ${provider} key ${i} Error]`, message);

        const isQuotaHit =
          message.includes("429") ||
          message.includes("403") ||
          message.includes("quota") ||
          message.includes("rate limit") ||
          message.includes("Too Many Requests");

        if (isQuotaHit) {
          await markKeyExhausted(provider, i);
        }
      }
    }
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
