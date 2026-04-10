import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AIProviderConfig from "@/models/AIProviderConfig";

const ALLOWED_PROVIDERS = ["gemini", "groq", "openrouter", "mistral", "cerebras"];

export async function PATCH(request: Request, context: any) {
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
    
    let providerArray = (config as any)[provider];
    if (providerArray && providerArray.length > keyIndex) {
      providerArray[keyIndex].isExhausted = false;
      providerArray[keyIndex].exhaustedAt = undefined;
      providerArray[keyIndex].resetAt = undefined;
      await config.save();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`PATCH Reset AI Key (${provider}) Error:`, error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
