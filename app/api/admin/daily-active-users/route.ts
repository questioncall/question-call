import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import DailyActiveUser from "@/models/DailyActiveUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 1), 90);

    // Build the full date list (oldest → newest)
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    await connectToDatabase();

    const records = await DailyActiveUser.aggregate([
      { $match: { date: { $gte: dates[0] } } },
      {
        $group: {
          _id: { date: "$date", platform: "$platform" },
          count: { $sum: 1 },
        },
      },
    ]);

    const map: Record<string, { web: number; app: number }> = {};
    for (const date of dates) {
      map[date] = { web: 0, app: 0 };
    }
    for (const r of records) {
      const { date, platform } = r._id as { date: string; platform: "web" | "app" };
      if (map[date]) {
        map[date][platform] = r.count as number;
      }
    }

    const data = dates.map((date) => ({
      date,
      web: map[date].web,
      app: map[date].app,
      total: map[date].web + map[date].app,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/admin/daily-active-users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
