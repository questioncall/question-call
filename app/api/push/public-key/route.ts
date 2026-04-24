import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/push/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured yet." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { publicKey: getWebPushPublicKey() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
