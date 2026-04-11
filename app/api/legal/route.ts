import { NextResponse } from "next/server";

import { getLegalContent, getPlatformConfig } from "@/models/PlatformConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPlatformConfig();

    return NextResponse.json(getLegalContent(config));
  } catch (error) {
    console.error("[GET /api/legal]", error);
    return NextResponse.json(
      { error: "Failed to load legal content" },
      { status: 500 },
    );
  }
}
