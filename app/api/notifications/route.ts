import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const notifications = await Notification.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        createdAt: new Date(n.createdAt).toISOString(),
      }))
    );
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
