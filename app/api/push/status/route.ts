import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isWebPushConfigured } from "@/lib/push/web-push";
import PushSubscriptionModel from "@/models/PushSubscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        subscriptionCount: 0,
        hasActiveSubscription: false,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  await connectToDatabase();

  const subscriptionCount = await PushSubscriptionModel.countDocuments({
    userId: session.user.id,
  });

  return NextResponse.json(
    {
      configured: true,
      subscriptionCount,
      hasActiveSubscription: subscriptionCount > 0,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
