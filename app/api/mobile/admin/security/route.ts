import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import AntiCheatAlert from "@/models/AntiCheatAlert";
import Channel from "@/models/Channel";
import PlatformConfig, { clearPlatformConfigCache, getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/security
 *
 * Mirror of the web Security page: anti-cheat config, recent collusion alerts
 * (teacher/student populated) and the top teacher-student frequency matrix.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const config = await getPlatformConfig();

    const alerts = await AntiCheatAlert.find()
      .populate("teacherId", "name username userImage")
      .populate("studentId", "name username userImage")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const matrix = await Channel.aggregate([
      { $match: { status: { $in: ["CLOSED", "ACTIVE"] } } },
      {
        $group: {
          _id: { teacher: "$acceptorId", student: "$askerId" },
          count: { $sum: 1 },
          lastAt: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    const teacherIds = [...new Set(matrix.map((m) => m._id.teacher))];
    const studentIds = [...new Set(matrix.map((m) => m._id.student))];
    const users = await User.find({ _id: { $in: [...teacherIds, ...studentIds] } })
      .select("name username userImage")
      .lean();
    const userMap = new Map((users as any[]).map((u) => [u._id.toString(), u]));

    const populatedMatrix = matrix.map((m) => ({
      teacher: userMap.get(m._id.teacher?.toString()) || { _id: m._id.teacher },
      student: userMap.get(m._id.student?.toString()) || { _id: m._id.student },
      count: m.count,
      lastAt: m.lastAt,
    }));

    return NextResponse.json({
      config: {
        antiCheatEnabled: config.antiCheatEnabled,
        antiCheatConsecutiveThreshold: config.antiCheatConsecutiveThreshold,
        antiCheatSuspensionDays: config.antiCheatSuspensionDays,
      },
      alerts,
      matrix: populatedMatrix,
    });
  } catch (error) {
    console.error("GET /api/mobile/admin/security error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/mobile/admin/security — save anti-cheat config. */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    await connectToDatabase();

    const doc = await PlatformConfig.findOne();
    if (doc) {
      if (typeof body.antiCheatEnabled === "boolean") doc.antiCheatEnabled = body.antiCheatEnabled;
      if (typeof body.antiCheatConsecutiveThreshold === "number")
        doc.antiCheatConsecutiveThreshold = body.antiCheatConsecutiveThreshold;
      if (typeof body.antiCheatSuspensionDays === "number")
        doc.antiCheatSuspensionDays = body.antiCheatSuspensionDays;
      await doc.save();
      clearPlatformConfigCache();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/mobile/admin/security error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
