import { NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { getOnboardingVideoForRole } from "@/lib/onboarding-videos";
import { getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";

export async function POST() {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getPlatformConfig();
    const activeVideo = getOnboardingVideoForRole(config, session.user.role);

    if (!activeVideo) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await User.findByIdAndUpdate(session.user.id, {
      $addToSet: { seenOnboardingRoles: session.user.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/onboarding-video/dismiss]", error);
    return NextResponse.json(
      { error: "Failed to dismiss onboarding video." },
      { status: 500 },
    );
  }
}
