import { NextResponse } from "next/server";

import { processExpiredRingingCalls } from "@/lib/call-expiration";
import { validateCronRequest } from "@/lib/cron-auth";
import { connectToDatabase } from "@/lib/mongodb";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function POST(request: Request) {
  try {
    const authResult = validateCronRequest(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const staleMs = parsePositiveInt(searchParams.get("staleMs"), 60_000);
    const limit = parsePositiveInt(searchParams.get("limit"), 100);
    const result = await processExpiredRingingCalls({ staleMs, limit });

    return NextResponse.json({
      message: `Processed ${result.processedCount} stale ringing call(s); marked ${result.missedCount} as missed.`,
      ...result,
    });
  } catch (error) {
    console.error("[POST /api/cron/expire-calls]", error);
    return NextResponse.json(
      { error: "Failed to process stale ringing calls" },
      { status: 500 },
    );
  }
}
