import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Notice from "@/models/Notice";
import User from "@/models/User";
import { sendPushNotificationToUser } from "@/lib/push/web-push";

export const dynamic = "force-dynamic";

/** GET /api/mobile/admin/notices — all notices, newest first. */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();
    const notices = await Notice.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(notices);
  } catch (error) {
    console.error("GET /api/mobile/admin/notices error:", error);
    return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
  }
}

/**
 * POST /api/mobile/admin/notices — create a notice (+ optional push broadcast).
 * Mirrors `POST /api/admin/notices` (image/video omitted on mobile).
 */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof json.title === "string" ? json.title : "";
    const type = typeof json.type === "string" ? json.type : "";
    const targetAudience =
      typeof json.targetAudience === "string" ? json.targetAudience : "";
    const trimmedBody = typeof json.body === "string" ? json.body.trim() : "";
    const imageUrl =
      typeof json.imageUrl === "string" && json.imageUrl.trim() ? json.imageUrl.trim() : null;
    const videoUrl =
      typeof json.videoUrl === "string" && json.videoUrl.trim() ? json.videoUrl.trim() : null;
    const targetEmails = Array.isArray(json.targetEmails)
      ? (json.targetEmails as unknown[]).filter(
          (e): e is string => typeof e === "string" && e.trim().length > 0,
        )
      : [];
    const isActive = typeof json.isActive === "boolean" ? json.isActive : true;
    const expiresAt = json.expiresAt ? String(json.expiresAt) : null;
    const sendPush = Boolean(json.sendPush);
    const pushMessage = typeof json.pushMessage === "string" ? json.pushMessage : "";

    if (!title || !type || !targetAudience) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!trimmedBody && !imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "A notice needs a message, an image, or a video." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const notice = await Notice.create({
      title,
      body: trimmedBody,
      imageUrl,
      videoUrl,
      type,
      targetAudience,
      targetEmails: targetAudience === "SPECIFIC" ? targetEmails : [],
      isActive,
      expiresAt: expiresAt || null,
    });

    if (sendPush) {
      const message = pushMessage.trim() || trimmedBody || title;
      const userQuery: Record<string, unknown> = { isSuspended: { $ne: true } };
      if (targetAudience === "TEACHER") userQuery.role = "TEACHER";
      else if (targetAudience === "STUDENT") userQuery.role = "STUDENT";
      else if (targetAudience === "SPECIFIC" && targetEmails.length > 0)
        userQuery.email = { $in: targetEmails };

      void (async () => {
        try {
          const users = await User.find(userQuery).select("_id").lean();
          const userIds = users.map((u: { _id: { toString(): string } }) =>
            u._id.toString(),
          );
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
          console.error("[mobile notices] Push broadcast failed:", err);
        }
      })();
    }

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error("POST /api/mobile/admin/notices error:", error);
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 });
  }
}
