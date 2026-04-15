import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AIProviderConfig from "@/models/AIProviderConfig";
import type { AIKeySlot } from "@/models/AIProviderConfig";

const ALLOWED_PROVIDERS = ["gemini", "groq", "openrouter", "mistral", "cerebras"];

export async function DELETE(request: Request, context: { params: Promise<{ provider: string; keyIndex: string }> }) {
  const params = await context.params;
  const provider = params.provider;
  const keyIndex = parseInt(params.keyIndex, 10);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (isNaN(keyIndex) || keyIndex < 0) {
      return NextResponse.json({ error: "Invalid key index" }, { status: 400 });
    }

    await connectToDatabase();
    const config = await AIProviderConfig.getSingleton();
    
    const providerArray = config[provider as keyof typeof config] as AIKeySlot[] | undefined;
    if (providerArray && providerArray.length > keyIndex) {
      providerArray.splice(keyIndex, 1);
      await config.save();
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(`DELETE AI Key (${provider}) Error:`, error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
