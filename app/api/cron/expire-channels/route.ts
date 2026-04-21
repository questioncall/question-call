import { NextResponse } from "next/server";

import { processExpiredChannels } from "@/lib/channel-expiration";
import { validateCronRequest } from "@/lib/cron-auth";

export async function POST(request: Request) {
  try {
    const authResult = validateCronRequest(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const result = await processExpiredChannels();

    return NextResponse.json({
      message: `Processed ${result.expiredCount} expired channel(s), auto-closed ${result.autoClosedCount} channel(s).`,
      expiredCount: result.expiredCount,
      autoClosedCount: result.autoClosedCount,
      processedCount: result.processedCount,
    });
  } catch (error) {
    console.error("[POST /api/cron/expire-channels]", error);
    return NextResponse.json(
      { error: "Failed to process expired channels" },
      { status: 500 },
    );
  }
}
