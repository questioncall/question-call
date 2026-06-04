import { NextResponse } from "next/server";

import { purgeExpiredDeletedAccounts } from "@/lib/account-deletion";
import { validateCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  return POST(request);
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

    const { purgedCount } = await purgeExpiredDeletedAccounts();

    return NextResponse.json({
      message: `Permanently anonymized ${purgedCount} account(s) past the recovery window.`,
      purgedCount,
    });
  } catch (error) {
    console.error("[POST /api/cron/purge-deleted-accounts]", error);
    return NextResponse.json(
      { error: "Failed to purge deleted accounts" },
      { status: 500 },
    );
  }
}
