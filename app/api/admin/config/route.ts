import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PlatformConfig, {
  getPlatformConfig,
  clearPlatformConfigCache,
  getPlatformSocialLinks,
} from "@/models/PlatformConfig";
import { pusherServer } from "@/lib/pusher/pusherServer";
import {
  ADMIN_UPDATES_CHANNEL,
  CONFIG_UPDATED_EVENT,
  PLATFORM_SOCIAL_LINKS_UPDATED_EVENT,
  PLATFORM_UPDATES_CHANNEL,
} from "@/lib/pusher/events";
import { normalizePlatformSocialLinks } from "@/lib/constants";

function getLegacySocialHandleUpdates(
  socialLinks: ReturnType<typeof normalizePlatformSocialLinks>,
) {
  const getValue = (platform: string) =>
    socialLinks.find((link) => link.platform === platform)?.url ?? "";

  return {
    socialFacebookHandle: getValue("facebook"),
    socialInstagramHandle: getValue("instagram"),
    socialWhatsappHandle: getValue("whatsapp"),
    socialYoutubeHandle: getValue("youtube"),
    socialTwitterHandle: getValue("twitter"),
    socialLinkedinHandle: getValue("linkedin"),
    socialTelegramHandle: getValue("telegram"),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getPlatformConfig();
    return NextResponse.json({
      ...config.toObject(),
      socialLinks: getPlatformSocialLinks(config),
    });
  } catch (error) {
    console.error("GET Admin Config Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();

    // Prevent _id or other protected fields from being overwritten
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    if ("socialLinks" in updates) {
      const normalizedSocialLinks = normalizePlatformSocialLinks(updates.socialLinks);
      updates.socialLinks = normalizedSocialLinks;
      Object.assign(updates, getLegacySocialHandleUpdates(normalizedSocialLinks));
    }

    await connectToDatabase();
    
    const config = await getPlatformConfig();
    
    // Update the single config document
    const updatedConfig = await PlatformConfig.findByIdAndUpdate(
      config._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedConfig) {
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }

    // Clear server cache so next call to getPlatformConfig reads fresh from DB
    clearPlatformConfigCache();

    // Broadcast config update event
    if (pusherServer) {
      const socialLinks = getPlatformSocialLinks(updatedConfig);

      await pusherServer
        .trigger(ADMIN_UPDATES_CHANNEL, CONFIG_UPDATED_EVENT, { updated: true, socialLinks })
        .catch(console.error);
      await pusherServer
        .trigger(PLATFORM_UPDATES_CHANNEL, PLATFORM_SOCIAL_LINKS_UPDATED_EVENT, { socialLinks })
        .catch(console.error);
    }

    return NextResponse.json({
      ...updatedConfig.toObject(),
      socialLinks: getPlatformSocialLinks(updatedConfig),
    });
  } catch (error: unknown) {
    console.error("PUT Admin Config Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
