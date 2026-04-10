import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PlatformConfig, { getPlatformConfig, clearPlatformConfigCache } from "@/models/PlatformConfig";
import { pusherServer } from "@/lib/pusher/pusherServer";
import { ADMIN_UPDATES_CHANNEL, CONFIG_UPDATED_EVENT } from "@/lib/pusher/events";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getPlatformConfig();
    return NextResponse.json(config);
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
        await pusherServer.trigger(ADMIN_UPDATES_CHANNEL, CONFIG_UPDATED_EVENT, { updated: true }).catch(console.error);
    }

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error("PUT Admin Config Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
