import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { sendPushNotificationToUser } from "@/lib/push/web-push";
import PushSubscriptionModel from "@/models/PushSubscription";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const subs = await PushSubscriptionModel.find({ userId: user.id })
    .select("endpoint platform createdAt updatedAt")
    .lean();

  console.log(
    `[push-test] User=${user.id} name=${user.name} has ${subs.length} subscription(s):`,
    subs.map((s) => ({
      platform: s.platform,
      endpoint: s.endpoint?.slice(0, 40) + "…",
      updatedAt: s.updatedAt,
    })),
  );

  if (subs.length === 0) {
    return NextResponse.json({
      error: "No push subscriptions found for your account",
      userId: user.id,
    });
  }

  await sendPushNotificationToUser(user.id, {
    type: "SYSTEM",
    title: "Push Test",
    message: "If you see this, push notifications are working!",
    href: "/",
  });

  return NextResponse.json({
    success: true,
    userId: user.id,
    subscriptionCount: subs.length,
    subscriptions: subs.map((s) => ({
      platform: s.platform,
      endpoint: s.endpoint?.slice(0, 40) + "…",
    })),
  });
}
