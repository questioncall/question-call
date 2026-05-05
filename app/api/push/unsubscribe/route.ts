import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    endpoint?: string;
  };

  if (!body.endpoint) {
    return NextResponse.json(
      { error: "Endpoint is required." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  await PushSubscriptionModel.deleteOne({
    userId: user.id,
    endpoint: body.endpoint,
  });

  return NextResponse.json({ success: true });
}
