import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { getAllServicesUsage } from "@/lib/admin/services-usage";

export const dynamic = "force-dynamic";

/** GET /api/mobile/admin/services — platform service health/usage (admin). */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const data = await getAllServicesUsage();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/mobile/admin/services error:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
