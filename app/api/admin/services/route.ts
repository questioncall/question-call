import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AIProviderConfig from "@/models/AIProviderConfig";
import { getPlatformConfig } from "@/models/PlatformConfig";

interface UsageMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  percentage: number;
}

interface ServiceDetail {
  id: string;
  name: string;
  icon: string;
  status: "healthy" | "warning" | "error";
  summary: string;
  details: Record<string, unknown>;
  usage: UsageMetric[];
  lastUpdated: string;
}

async function getMuxUsage(): Promise<ServiceDetail> {
  const hasConfig = process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET;
  if (!hasConfig) {
    return {
      id: "mux",
      name: "Mux Video",
      icon: "Video",
      status: "error",
      summary: "Not configured",
      details: {},
      usage: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    id: "mux",
    name: "Mux Video",
    icon: "Video",
    status: "healthy",
    summary: "Video encoding & streaming",
    details: {
      tokenId: process.env.MUX_TOKEN_ID?.slice(0, 8) + "...",
    },
    usage: [
      { label: "Encoding Minutes", value: 0, max: 500, unit: "min", percentage: 0 },
      { label: "Storage", value: 0, max: 1000, unit: "min", percentage: 0 },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

async function getLiveKitUsage(): Promise<ServiceDetail> {
  const hasConfig = process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY;
  if (!hasConfig) {
    return {
      id: "livekit",
      name: "LiveKit",
      icon: "Video",
      status: "error",
      summary: "Not configured",
      details: {},
      usage: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    id: "livekit",
    name: "LiveKit",
    icon: "Video",
    status: "healthy",
    summary: "Real-time video streaming",
    details: {
      url: process.env.LIVEKIT_URL || "",
      apiKey: process.env.LIVEKIT_API_KEY?.slice(0, 8) + "...",
    },
    usage: [
      { label: "Rooms", value: 0, max: 50, unit: "rooms", percentage: 0 },
      { label: "Participants", value: 0, max: 200, unit: "users", percentage: 0 },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

async function getCloudinaryUsage(): Promise<ServiceDetail> {
  const hasConfig = process.env.CLOUDINARY_CLOUD_NAME;
  if (!hasConfig) {
    return {
      id: "cloudinary",
      name: "Cloudinary",
      icon: "Cloud",
      status: "error",
      summary: "Not configured",
      details: {},
      usage: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    id: "cloudinary",
    name: "Cloudinary",
    icon: "Cloud",
    status: "healthy",
    summary: "Image & video storage",
    details: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.slice(0, 6) + "..." : "",
    },
    usage: [
      { label: "Storage", value: 0, max: 10, unit: "GB", percentage: 0 },
      { label: "Bandwidth", value: 0, max: 15, unit: "GB", percentage: 0 },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

async function getResendUsage(): Promise<ServiceDetail> {
  const hasConfig = process.env.RESEND_API_KEY;
  if (!hasConfig) {
    return {
      id: "resend",
      name: "Resend Email",
      icon: "Mail",
      status: "error",
      summary: "Not configured",
      details: {},
      usage: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    id: "resend",
    name: "Resend Email",
    icon: "Mail",
    status: "healthy",
    summary: "Email delivery service",
    details: {
      fromEmail: process.env.RESEND_FROM_EMAIL,
      fromName: process.env.RESEND_FROM_NAME,
    },
    usage: [
      { label: "Emails Sent", value: 0, max: 3000, unit: "emails/mo", percentage: 0 },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

async function getAIUsage(): Promise<ServiceDetail> {
  try {
    await connectToDatabase();
    const aiConfig = await AIProviderConfig.getSingleton();
    
    console.log("[Services] AI Config:", {
      gemini: aiConfig.gemini?.length,
      groq: aiConfig.groq?.length,
      openrouter: aiConfig.openrouter?.length,
      mistral: aiConfig.mistral?.length,
      cerebras: aiConfig.cerebras?.length,
    });

    const providerData: Record<string, { total: number; active: number; exhausted: number }> = {};
    const providers = ["gemini", "groq", "openrouter", "mistral", "cerebras"];

    for (const p of providers) {
      const keys = (aiConfig as unknown as Record<string, { isExhausted?: boolean }[]>)[p] || [];
      if (Array.isArray(keys)) {
        const active = keys.filter((k) => !k?.isExhausted).length;
        providerData[p] = {
          total: keys.length,
          active,
          exhausted: keys.length - active,
        };
      } else {
        providerData[p] = { total: 0, active: 0, exhausted: 0 };
      }
    }

    const totalKeys = Object.values(providerData).reduce((acc, p) => acc + p.total, 0);
    const activeKeys = Object.values(providerData).reduce((acc, p) => acc + p.active, 0);
    const activePercentage = totalKeys > 0 ? (activeKeys / totalKeys) * 100 : 0;
    const status = activeKeys === 0 ? "error" : activeKeys < totalKeys ? "warning" : "healthy";

    return {
      id: "ai",
      name: "AI Providers",
      icon: "Cpu",
      status: status as "healthy" | "warning" | "error",
      summary: `${activeKeys}/${totalKeys} keys active (${activePercentage.toFixed(0)}%)`,
      details: providerData,
      usage: [
        {
          label: "Active Keys",
          value: activeKeys,
          max: totalKeys || 1,
          unit: "keys",
          percentage: activePercentage,
        },
        {
          label: "Exhausted Keys",
          value: totalKeys - activeKeys,
          max: totalKeys || 1,
          unit: "keys",
          percentage: totalKeys > 0 ? ((totalKeys - activeKeys) / totalKeys) * 100 : 0,
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("AI config error:", error);
    return {
      id: "ai",
      name: "AI Providers",
      icon: "Cpu",
      status: "error",
      summary: "Error loading config",
      details: {},
      usage: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

async function getMongoDBUsage(): Promise<ServiceDetail> {
  const hasConfig = process.env.MONGODB_URI;
  return {
    id: "mongodb",
    name: "MongoDB Atlas",
    icon: "Database",
    status: hasConfig ? "healthy" : "error",
    summary: hasConfig ? "Database connected" : "Not configured",
    details: {
      uri: hasConfig ? process.env.MONGODB_URI?.replace(/\/\/.*:.*@/, "//[credentials]@") : "",
    },
    usage: [],
    lastUpdated: new Date().toISOString(),
  };
}

async function getEsewaUsage(): Promise<ServiceDetail> {
  try {
    const platformConfig = await getPlatformConfig();
    const configAny = platformConfig as unknown as { manualPaymentEsewaNumber?: string };
    const esewaNumber = configAny.manualPaymentEsewaNumber;

    return {
      id: "esewa",
      name: "eSewa Payment",
      icon: "CreditCard",
      status: esewaNumber ? "healthy" : "error",
      summary: esewaNumber ? `Account: ${esewaNumber}` : "Not configured",
      details: {
        accountNumber: esewaNumber,
      },
      usage: [],
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: "esewa",
      name: "eSewa Payment",
      icon: "CreditCard",
      status: "error",
      summary: "Error loading config",
      details: {},
      usage: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function GET() {
  try {
    const [mux, livekit, cloudinary, resend, ai, mongodb, esewa] = await Promise.all([
      getMuxUsage(),
      getLiveKitUsage(),
      getCloudinaryUsage(),
      getResendUsage(),
      getAIUsage(),
      getMongoDBUsage(),
      getEsewaUsage(),
    ]);

    const services: ServiceDetail[] = [
      mux,
      livekit,
      cloudinary,
      resend,
      ai,
      mongodb,
      esewa,
    ];

    return NextResponse.json({
      services,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}