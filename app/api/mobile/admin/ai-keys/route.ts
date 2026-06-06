import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import AIProviderConfig, { type AIKeySlot } from "@/models/AIProviderConfig";

export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS = ["gemini", "groq", "openrouter", "mistral", "cerebras"] as const;

function maskKey(key: string) {
  if (!key) return "";
  if (key.length <= 4) return "****";
  return `sk-...${key.slice(-4)}`;
}

/**
 * GET /api/mobile/admin/ai-keys
 *
 * Mobile mirror of `GET /api/admin/ai-keys` — returns the provider priority
 * order plus each provider's key slots with the raw key MASKED. Never returns
 * real keys.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();
    const config = await AIProviderConfig.getSingleton();

    const payload: { providerOrder: string[]; [key: string]: unknown } = {
      providerOrder: config.providerOrder,
    };

    const now = new Date();
    for (const provider of ALLOWED_PROVIDERS) {
      const keys = (config[provider] || []) as (AIKeySlot & { _id?: mongoose.Types.ObjectId })[];
      payload[provider] = keys.map((k) => {
        let status = "ACTIVE";
        if (k.isExhausted) {
          status = k.resetAt && now >= new Date(k.resetAt) ? "RESETTING" : "EXHAUSTED";
        }
        return {
          _id: k._id,
          maskedKey: maskKey(k.key),
          label: k.label,
          status,
          isExhausted: k.isExhausted,
          exhaustedAt: k.exhaustedAt,
          lastUsedAt: k.lastUsedAt,
          resetAt: k.resetAt,
        };
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/mobile/admin/ai-keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/mobile/admin/ai-keys — reorder provider priority. */
export async function PATCH(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { providerOrder } = await request.json();
    if (!Array.isArray(providerOrder)) {
      return NextResponse.json({ error: "providerOrder must be an array" }, { status: 400 });
    }

    await connectToDatabase();
    const config = await AIProviderConfig.getSingleton();
    config.providerOrder = providerOrder;
    await config.save();

    return NextResponse.json({ success: true, providerOrder: config.providerOrder });
  } catch (error: unknown) {
    console.error("PATCH /api/mobile/admin/ai-keys error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/mobile/admin/ai-keys — add / delete / reset a key.
 * Body: { action: "add", provider, key, label }
 *     | { action: "delete" | "reset", provider, keyIndex }
 *
 * Consolidates the web's per-key sub-routes into one mobile endpoint.
 */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const body = (await request.json()) as {
      action?: string;
      provider?: string;
      key?: string;
      label?: string;
      keyIndex?: number;
    };
    const { action, provider } = body;

    if (!provider || !ALLOWED_PROVIDERS.includes(provider as (typeof ALLOWED_PROVIDERS)[number])) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    await connectToDatabase();
    const config = await AIProviderConfig.getSingleton();
    const providerArray = config[provider as keyof typeof config] as AIKeySlot[] | undefined;
    if (!providerArray) {
      return NextResponse.json({ error: "Provider not configured" }, { status: 400 });
    }

    if (action === "add") {
      if (!body.key) {
        return NextResponse.json({ error: "API key is required" }, { status: 400 });
      }
      providerArray.push({ key: body.key, label: body.label, isExhausted: false } as AIKeySlot);
      await config.save();
      return NextResponse.json({ success: true });
    }

    const keyIndex = Number(body.keyIndex);
    if (!Number.isInteger(keyIndex) || keyIndex < 0 || keyIndex >= providerArray.length) {
      return NextResponse.json({ error: "Invalid key index" }, { status: 400 });
    }

    if (action === "delete") {
      providerArray.splice(keyIndex, 1);
      await config.save();
      return NextResponse.json({ success: true });
    }

    if (action === "reset") {
      providerArray[keyIndex]!.isExhausted = false;
      providerArray[keyIndex]!.exhaustedAt = undefined;
      providerArray[keyIndex]!.resetAt = undefined;
      await config.save();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("POST /api/mobile/admin/ai-keys error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
