import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notice from "@/models/Notice";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select("seenNotices role email");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const seenNotices = user.seenNotices || [];

    // Base query: isActive, not expired
    const query: any = {
      isActive: true,
      _id: { $nin: seenNotices },
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null },
      ]
    };

    // Audience matching logic: "ALL", or User's exact role, or "SPECIFIC" with email match
    query.$and = [
      {
        $or: [
          { targetAudience: "ALL" },
          { targetAudience: user.role },
          { 
            targetAudience: "SPECIFIC",
            targetEmails: { $in: [user.email] }
          }
        ]
      }
    ];

    const notices = await Notice.find(query).sort({ createdAt: -1 });

    return NextResponse.json(notices);
  } catch (error) {
    console.error("[GET /api/notices]", error);
    return NextResponse.json(
      { error: "Failed to fetch notices." },
      { status: 500 }
    );
  }
}
