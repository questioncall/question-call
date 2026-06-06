import { NextResponse } from "next/server";

import { getAllServicesUsage } from "@/lib/admin/services-usage";

export async function GET() {
  try {
    const data = await getAllServicesUsage();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
