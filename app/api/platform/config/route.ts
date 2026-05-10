import { NextResponse } from "next/server";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    const config = await getPlatformConfig();
    const plain = config.toObject ? config.toObject() : { ...config };
    return NextResponse.json({ ...plain, plans: getHydratedPlans(config) }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch platform config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
