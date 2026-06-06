import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { getAdminNotificationCounts } from "@/lib/admin-notifications";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

function getNotificationIds(payload: { ids?: unknown }): string[] {
  if (!Array.isArray(payload.ids)) return [];
  return Array.from(
    new Set(
      payload.ids.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
  );
}

/**
 * POST /api/mobile/admin/notifications/read
 * Body: { ids: string[] }  (empty ids → just returns the current unread count)
 * Mobile mirror of `POST /api/admin/notifications/read`.
 */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
    const ids = getNotificationIds(body);

    if (ids.length > 0) {
      await connectToDatabase();
      await User.findByIdAndUpdate(gate.userId, {
        $addToSet: { seenAdminNotifications: { $each: ids } },
      });
    }

    const counts = await getAdminNotificationCounts(gate.userId);
    return NextResponse.json({
      success: true,
      unreadNotifications: counts.unreadNotifications,
    });
  } catch (error) {
    console.error("POST /api/mobile/admin/notifications/read error:", error);
    return NextResponse.json(
      { error: "Failed to update admin notifications." },
      { status: 500 },
    );
  }
}
