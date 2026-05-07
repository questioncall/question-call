import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getOnboardingVideoForRole } from "@/lib/onboarding-videos";
import { getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser?.id || !authUser.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [config, user] = await Promise.all([
      getPlatformConfig(),
      User.findById(authUser.id).select("seenOnboardingRoles role").lean(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = user.role;
    const video = getOnboardingVideoForRole(config, role);
    const seenRoles = Array.isArray(user.seenOnboardingRoles)
      ? user.seenOnboardingRoles
      : [];

    return NextResponse.json({
      shouldShow: Boolean(video) && !seenRoles.includes(role),
      role,
      video,
    });
  } catch (error) {
    console.error("[GET /api/onboarding-video]", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding video." },
      { status: 500 },
    );
  }
}
