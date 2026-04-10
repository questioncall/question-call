import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AIProviderConfig from "@/models/AIProviderConfig";

function maskKey(key: string) {
  if (!key) return "";
  if (key.length <= 4) return "****";
  return `sk-...${key.slice(-4)}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const config = await AIProviderConfig.getSingleton();
    
    const providers = ["gemini", "groq", "openrouter", "mistral", "cerebras"] as const;
    
    // Create a safe payload without real keys
    const payload: any = {
      providerOrder: config.providerOrder,
    };

    const now = new Date();

    for (const provider of providers) {
      const keys = config[provider] || [];
      payload[provider] = keys.map((k: any) => {
        let status = "ACTIVE";
        if (k.isExhausted) {
          if (k.resetAt && now >= new Date(k.resetAt)) {
            status = "RESETTING"; // Grace period before lazy reset takes over
          } else {
            status = "EXHAUSTED";
          }
        }

        return {
          _id: k._id,
          maskedKey: maskKey(k.key),
          label: k.label,
          status,
          isExhausted: k.isExhausted,
          exhaustedAt: k.exhaustedAt,
          lastUsedAt: k.lastUsedAt,
          resetAt: k.resetAt
        };
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET AI Keys Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerOrder } = await request.json();

    if (!Array.isArray(providerOrder)) {
      return NextResponse.json({ error: "providerOrder must be an array" }, { status: 400 });
    }

    await connectToDatabase();
    const config = await AIProviderConfig.getSingleton();
    
    config.providerOrder = providerOrder;
    await config.save();

    return NextResponse.json({ success: true, providerOrder: config.providerOrder });
  } catch (error: any) {
    console.error("PATCH AI Keys Order Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
