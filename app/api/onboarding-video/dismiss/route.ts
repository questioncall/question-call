import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { getOnboardingVideoForRole } from "@/lib/onboarding-videos";
import { getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser?.id || !authUser.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getPlatformConfig();
    const activeVideo = getOnboardingVideoForRole(config, authUser.role);

    if (!activeVideo) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await User.findByIdAndUpdate(authUser.id, {
      $addToSet: { seenOnboardingRoles: authUser.role },
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
