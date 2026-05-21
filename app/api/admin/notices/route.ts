import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notice from "@/models/Notice";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendPushNotificationToUser } from "@/lib/push/web-push";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    const notices = await Notice.find().sort({ createdAt: -1 });
    return NextResponse.json(notices);
  } catch (error) {
    console.error("[GET /api/admin/notices]", error);
    return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const {
      title,
      body,
      type,
      targetAudience,
      targetEmails,
      isActive,
      expiresAt,
      sendPush,
      pushMessage,
    } = json;

    if (!title || !body || !type || !targetAudience) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const notice = await Notice.create({
      title,
      body,
      type,
      targetAudience,
      targetEmails: targetAudience === "SPECIFIC" ? targetEmails : [],
      isActive: isActive ?? true,
      expiresAt: expiresAt || null,
    });

    // Fire push notifications in the background — don't block the response
    if (sendPush) {
      const message = (pushMessage as string | undefined)?.trim() || body;

      // Build user query based on target audience
      const userQuery: Record<string, unknown> = { isSuspended: { $ne: true } };
      if (targetAudience === "TEACHER") {
        userQuery.role = "TEACHER";
      } else if (targetAudience === "STUDENT") {
        userQuery.role = "STUDENT";
      } else if (targetAudience === "SPECIFIC" && Array.isArray(targetEmails) && targetEmails.length > 0) {
        userQuery.email = { $in: targetEmails };
      }

      void (async () => {
        try {
          const users = await User.find(userQuery).select("_id").lean();
          const userIds = users.map((u: { _id: { toString(): string } }) => u._id.toString());
          console.log(`[notices] Sending push to ${userIds.length} users for notice "${title}"`);
          await Promise.allSettled(
            userIds.map((userId: string) =>
              sendPushNotificationToUser(userId, {
                type: "SYSTEM",
                message,
                href: null,
                title,
              }),
            ),
          );
        } catch (err) {
          console.error("[notices] Push broadcast failed:", err);
        }
      })();
    }

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/notices]", error);
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 });
  }
}
