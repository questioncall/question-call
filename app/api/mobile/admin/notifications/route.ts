import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { getAdminNotifications } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/notifications?history=true
 * Mobile mirror of `GET /api/admin/notifications`.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const history = new URL(request.url).searchParams.get("history") === "true";
    const notifications = await getAdminNotifications(gate.userId, { history });
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/mobile/admin/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
