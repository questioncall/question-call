import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AIProviderConfig from "@/models/AIProviderConfig";

const ALLOWED_PROVIDERS = ["gemini", "groq", "openrouter", "mistral", "cerebras"];

export async function POST(request: Request, context: any) {
  const params = await context.params;
  const provider = params.provider;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const { key, label } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    await connectToDatabase();
    const config = await AIProviderConfig.getSingleton();

    const providerArray = (config as any)[provider];
    if (providerArray) {
      providerArray.push({
        key,
        label,
        isExhausted: false,
      });
      await config.save();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`POST Add AI Key (${provider}) Error:`, error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
