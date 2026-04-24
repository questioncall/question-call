import { NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { getAdminNotificationCounts } from "@/lib/admin-notifications";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

type ReadNotificationsPayload = {
  ids?: unknown;
};

function getNotificationIds(payload: ReadNotificationsPayload) {
  if (!Array.isArray(payload.ids)) {
    return [];
  }

  return Array.from(
    new Set(
      payload.ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    ),
  );
}

export async function POST(request: Request) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ReadNotificationsPayload;
    const ids = getNotificationIds(body);

    if (ids.length === 0) {
      const counts = await getAdminNotificationCounts(session.user.id);
      return NextResponse.json({ success: true, unreadNotifications: counts.unreadNotifications });
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(session.user.id, {
      $addToSet: {
        seenAdminNotifications: { $each: ids },
      },
    });

    const counts = await getAdminNotificationCounts(session.user.id);

    return NextResponse.json({ success: true, unreadNotifications: counts.unreadNotifications });
  } catch (error) {
    console.error("[POST /api/admin/notifications/read]", error);
    return NextResponse.json(
      { error: "Failed to update admin notifications." },
      { status: 500 },
    );
  }
}
