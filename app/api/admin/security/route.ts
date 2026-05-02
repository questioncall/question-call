import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AntiCheatAlert from "@/models/AntiCheatAlert";
import Channel from "@/models/Channel";
import PlatformConfig, { clearPlatformConfigCache, getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      { $group: {
        _id: { teacher: "$acceptorId", student: "$askerId" },
        count: { $sum: 1 },
        lastAt: { $max: "$createdAt" }
      }},
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    // Populate matrix manually
    const teacherIds = [...new Set(matrix.map(m => m._id.teacher))];
    const studentIds = [...new Set(matrix.map(m => m._id.student))];
    const users = await User.find({ _id: { $in: [...teacherIds, ...studentIds] } }).select("name username userImage").lean();
    const userMap = new Map((users as any[]).map(u => [u._id.toString(), u]));

    const populatedMatrix = matrix.map(m => ({
      teacher: userMap.get(m._id.teacher?.toString()) || { _id: m._id.teacher },
      student: userMap.get(m._id.student?.toString()) || { _id: m._id.student },
      count: m.count,
      lastAt: m.lastAt
    }));

    return NextResponse.json({
      config: {
        antiCheatEnabled: config.antiCheatEnabled,
        antiCheatConsecutiveThreshold: config.antiCheatConsecutiveThreshold,
        antiCheatSuspensionDays: config.antiCheatSuspensionDays,
      },
      alerts,
      matrix: populatedMatrix
    });
  } catch (error) {
    console.error("Admin Security GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();

    const doc = await PlatformConfig.findOne();
    if (doc) {
      if (typeof body.antiCheatEnabled === "boolean") doc.antiCheatEnabled = body.antiCheatEnabled;
      if (typeof body.antiCheatConsecutiveThreshold === "number") doc.antiCheatConsecutiveThreshold = body.antiCheatConsecutiveThreshold;
      if (typeof body.antiCheatSuspensionDays === "number") doc.antiCheatSuspensionDays = body.antiCheatSuspensionDays;
      await doc.save();
      clearPlatformConfigCache();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Security POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
