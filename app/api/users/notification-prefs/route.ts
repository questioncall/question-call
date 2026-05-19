import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  normalizeNotificationPrefs,
  type UserNotificationPrefs,
} from "@/lib/notification-prefs";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

// All four keys are required on PATCH so the client always writes a complete
// document. This avoids partial-update races where the UI shows one value but
// the DB stores another.
const notificationPrefsSchema = z.object({
  questions: z.boolean(),
  chat: z.boolean(),
  wallet: z.boolean(),
  announcements: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(authUser.id)
      .select("notificationPrefs")
      .lean<{ notificationPrefs?: Partial<UserNotificationPrefs> | null } | null>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { notificationPrefs: normalizeNotificationPrefs(user.notificationPrefs) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get notification prefs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = notificationPrefsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const updatedUser = await User.findByIdAndUpdate(
      authUser.id,
      { $set: { notificationPrefs: parsed.data } },
      { new: true, runValidators: true },
    )
      .select("notificationPrefs")
      .lean<{ notificationPrefs?: Partial<UserNotificationPrefs> | null } | null>();

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Notification preferences updated",
        notificationPrefs: normalizeNotificationPrefs(updatedUser.notificationPrefs),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Notification prefs update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
