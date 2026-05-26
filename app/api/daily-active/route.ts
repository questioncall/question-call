import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { recordDailyActiveUser } from "@/lib/daily-active";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const platform: "web" | "app" = body.platform === "app" ? "app" : "web";

    await recordDailyActiveUser(authUser.id, platform);

    return NextResponse.json({ recorded: true });
  } catch (error) {
    console.error("POST /api/daily-active error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
