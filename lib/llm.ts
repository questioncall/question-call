import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { Mistral } from "@mistralai/mistralai";
import AIProviderConfig, { IAIProviderConfig, AIKeySlot } from "@/models/AIProviderConfig";
import { connectToDatabase } from "@/lib/mongodb";

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

// In-memory cache
let cachedConfig: IAIProviderConfig | null = null;
let cacheFetchedAt = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

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
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

async function markKeyExhausted(provider: string, keyIndex: number) {
  const config = await getConfig();
  const providerArray = (config as any)[provider] as AIKeySlot[];
  if (providerArray && providerArray[keyIndex]) {
    providerArray[keyIndex].isExhausted = true;
    providerArray[keyIndex].exhaustedAt = new Date();
    providerArray[keyIndex].resetAt = getNextMidnightUTC();
    await config.save();
    cachedConfig = config;
  }
}

async function markKeyUsed(provider: string, keyIndex: number) {
  const config = await getConfig();
  const providerArray = (config as any)[provider] as AIKeySlot[];
  if (providerArray && providerArray[keyIndex]) {
    providerArray[keyIndex].lastUsedAt = new Date();
    await config.save();
    cachedConfig = config;
  }
}

async function autoResetKeys(config: IAIProviderConfig): Promise<boolean> {
  let updated = false;
  const now = new Date();
  const providers = ["gemini", "groq", "openrouter", "mistral", "cerebras"];

  for (const provider of providers) {
    const keys = (config as any)[provider] as AIKeySlot[];
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

// Implementations of each provider
async function runGemini(key: string, prompt: string, opts: LLMOptions): Promise<string> {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  
  const fullPrompt = opts.systemPrompt 
    ? `System Instruction:\n${opts.systemPrompt}\n\nUser Request:\n${prompt}` 
    : prompt;

  const result = await model.generateContent(opts.json ? fullPrompt + "\nRespond ONLY in valid JSON." : fullPrompt);
  const response = result.response;
  return response.text();
}

async function runGroq(key: string, prompt: string, opts: LLMOptions): Promise<string> {
  const groq = new Groq({ apiKey: key });
  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  const finalPrompt = opts.json ? prompt + "\nRespond ONLY in valid JSON." : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const completion = await groq.chat.completions.create({
    messages,
    model: "llama-3.1-8b-instant",
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
  });
  return completion.choices[0]?.message?.content || "";
}

async function runMistral(key: string, prompt: string, opts: LLMOptions): Promise<string> {
  const mistral = new Mistral({ apiKey: key });
  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  const finalPrompt = opts.json ? prompt + "\nRespond ONLY in valid JSON." : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const chatResponse = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages,
    temperature: opts.temperature ?? 0.7,
    maxTokens: opts.maxTokens ?? 1024,
  });
  
  return (chatResponse.choices?.[0]?.message?.content as string) || "";
}

async function runOpenRouter(key: string, prompt: string, opts: LLMOptions): Promise<string> {
  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  const finalPrompt = opts.json ? prompt + "\nRespond ONLY in valid JSON." : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct:free",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
    })
  });

  if (!res.ok) {
    throw new Error(`OpenRouter HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function runCerebras(key: string, prompt: string, opts: LLMOptions): Promise<string> {
  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  const finalPrompt = opts.json ? prompt + "\nRespond ONLY in valid JSON." : prompt;
  messages.push({ role: "user", content: finalPrompt });

  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "llama3.1-8b",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
    })
  });

  if (!res.ok) {
    throw new Error(`Cerebras HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function executeAttempt(prompt: string, opts: LLMOptions = {}): Promise<string> {
  let config = await getConfig();
  await autoResetKeys(config);
  
  // Process through the defined provider order
  for (const provider of config.providerOrder) {
    const keys = (config as any)[provider] as AIKeySlot[];
    if (!keys || keys.length === 0) continue;

    for (let i = 0; i < keys.length; i++) {
      const keyObj = keys[i];
      if (keyObj.isExhausted) continue; // Skip exhausted keys

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

        // Successfully generated
        await markKeyUsed(provider, i);
        return result;

      } catch (err: any) {
        console.error(`[LLM ${provider} key ${i} Error]`, err.message);
        
        // Handle rate limiting and quotas
        const msg = err.message || "";
        const isQuotaHit = msg.includes("429") || msg.includes("403") || msg.includes("quota") || msg.includes("rate limit") || msg.includes("Too Many Requests");
        
        if (isQuotaHit) {
          // Exhaust the key
          await markKeyExhausted(provider, i);
        } else {
          // Standard error (network failure, bad prompt) -> we just bubble it up or continue to the next one?
          // Since we want robust fallback, we will just move to the next key on ANY error.
        }
      }
    }
  }

  throw new LLMExhaustedError("All AI providers and keys are currently exhausted or failing.");
}

export async function llmGenerate(prompt: string, opts: LLMOptions = {}): Promise<string> {
  try {
    return await executeAttempt(prompt, opts);
  } catch (err: any) {
    console.error("[llmGenerate Primary Failure]", err.message);
    
    // As per user request, we catch the error, log it, retry once implicitly by calling it again 
    // Wait, retry might just fail immediately if all are exhausted. We'll do a simple raw retry
    // In case temporary network failure was the culprit.
    try {
      if (err instanceof LLMExhaustedError) {
         // All are exhausted, a simple retry won't fix this unless 1 ms makes a difference
         console.warn("[llmGenerate] All providers exhausted, returning empty data fallback.");
         return "";
      }
      
      console.warn("[llmGenerate] Retrying one more time...");
      return await executeAttempt(prompt, opts);
    } catch (retryErr) {
      console.error("[llmGenerate Retry Failure - Final]", retryErr);
      return "";
    }
  }
}
