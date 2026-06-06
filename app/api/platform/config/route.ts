import { NextResponse } from "next/server";
import {
  getPlatformConfig,
  getHydratedPlans,
  getLandingUserCountOffset,
} from "@/models/PlatformConfig";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    await connectToDatabase();
    const config = await getPlatformConfig();
    const plain = config.toObject ? config.toObject() : { ...config };
    const realUserCount = await User.countDocuments({
      role: { $in: ["STUDENT", "TEACHER"] },
    });
    const landingUserCountOffset = getLandingUserCountOffset(config);

    return NextResponse.json(
      {
        ...plain,
        landingUserCount: realUserCount,
        landingUserCountOffset,
        landingDisplayUserCount: realUserCount + landingUserCountOffset,
        plans: getHydratedPlans(config),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch platform config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
