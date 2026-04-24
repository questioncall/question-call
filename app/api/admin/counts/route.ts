import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getAdminNotificationCounts } from "@/lib/admin-notifications";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counts = await getAdminNotificationCounts(session.user.id);

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Admin counts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 }
    );
  }
}
