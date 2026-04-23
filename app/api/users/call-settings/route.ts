import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  CALL_RINGTONE_VALUES,
  normalizeCallSettings,
  type UserCallSettings,
} from "@/lib/call-settings";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const callSettingsSchema = z.object({
  silentIncomingCalls: z.boolean(),
  incomingRingtone: z.enum(CALL_RINGTONE_VALUES),
  outgoingRingtone: z.enum(CALL_RINGTONE_VALUES),
});

export async function GET() {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id)
      .select("callSettings")
      .lean<{ callSettings?: Partial<UserCallSettings> | null } | null>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { callSettings: normalizeCallSettings(user.callSettings) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get call settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = callSettingsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: { callSettings: parsed.data } },
      { new: true, runValidators: true },
    )
      .select("callSettings")
      .lean<{ callSettings?: Partial<UserCallSettings> | null } | null>();

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Call settings updated successfully",
        callSettings: normalizeCallSettings(updatedUser.callSettings),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Call settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
