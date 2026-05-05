import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isWebPushConfigured } from "@/lib/push/web-push";
import PushSubscriptionModel from "@/models/PushSubscription";

type PushSubscriptionInput = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  platform?: "web" | "ios" | "android";
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    subscription?: PushSubscriptionInput;
  };
  const subscription = body.subscription;
  const platform = subscription?.platform ?? "web";

  // FCM (Android) tokens don't use VAPID or web-push keys — skip those checks
  if (platform !== "android" && !isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured yet." },
      { status: 503 },
    );
  }

  if (!subscription?.endpoint) {
    return NextResponse.json(
      { error: "A valid push subscription is required." },
      { status: 400 },
    );
  }

  if (platform !== "android" && (!subscription.keys?.p256dh || !subscription.keys?.auth)) {
    return NextResponse.json(
      { error: "A valid push subscription is required." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const updateFields: Record<string, unknown> = {
    userId: user.id,
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    userAgent: request.headers.get("user-agent"),
    platform,
  };

  // FCM (Android) tokens have no web-push keys — only store keys for web/iOS
  if (platform !== "android") {
    updateFields.keys = {
      p256dh: subscription.keys!.p256dh,
      auth: subscription.keys!.auth,
    };
  }

  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { $set: updateFields },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return NextResponse.json({ success: true });
}
