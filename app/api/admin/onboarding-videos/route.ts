import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getOnboardingVideos,
  normalizeOnboardingVideos,
} from "@/lib/onboarding-videos";
import PlatformConfig, {
  clearPlatformConfigCache,
  getPlatformConfig,
} from "@/models/PlatformConfig";
import { pusherServer } from "@/lib/pusher/pusherServer";
import {
  ADMIN_UPDATES_CHANNEL,
  CONFIG_UPDATED_EVENT,
} from "@/lib/pusher/events";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getPlatformConfig();
    return NextResponse.json({
      videos: getOnboardingVideos(config),
    });
  } catch (error) {
    console.error("[GET /api/admin/onboarding-videos]", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding videos." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      videos?: unknown;
    };
    const videos = normalizeOnboardingVideos(body.videos);

    await connectToDatabase();
    const config = await getPlatformConfig();

    const updatedConfig = await PlatformConfig.findByIdAndUpdate(
      config._id,
      { $set: { onboardingVideos: videos } },
      { new: true, runValidators: true },
    );

    if (!updatedConfig) {
      return NextResponse.json(
        { error: "Failed to update onboarding videos." },
        { status: 500 },
      );
    }

    clearPlatformConfigCache();

    if (pusherServer) {
      await pusherServer
        .trigger(ADMIN_UPDATES_CHANNEL, CONFIG_UPDATED_EVENT, { updated: true })
        .catch(console.error);
    }

    return NextResponse.json({
      videos: getOnboardingVideos(updatedConfig),
    });
  } catch (error) {
    console.error("[PUT /api/admin/onboarding-videos]", error);
    return NextResponse.json(
      { error: "Failed to save onboarding videos." },
      { status: 500 },
    );
  }
}
