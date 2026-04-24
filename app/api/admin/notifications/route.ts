import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getAdminNotifications } from "@/lib/admin-notifications";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const history = searchParams.get("history") === "true";

    const notifications = await getAdminNotifications(session.user.id, { history });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
