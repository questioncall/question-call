import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
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
};

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as {
    subscription?: PushSubscriptionInput;
  };
  const subscription = body.subscription;

  if (
    !subscription?.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return NextResponse.json(
      { error: "A valid push subscription is required." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        userAgent: request.headers.get("user-agent"),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return NextResponse.json({ success: true });
}
