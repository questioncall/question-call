import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS);

    const onlineUsers = await User.find({
      _id: { $ne: authUser.id },
      lastActiveAt: { $gte: cutoff },
      isSuspended: { $ne: true },
    })
      .select("name userImage role")
      .limit(30)
      .lean();

    const result = onlineUsers.map((u) => ({
      _id: (u._id as { toString(): string }).toString(),
      name: u.name as string,
      image: (u.userImage as string) || null,
      role: u.role as string,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/users/online]", error);
    return NextResponse.json(
      { error: "Failed to fetch online users" },
      { status: 500 },
    );
  }
}
