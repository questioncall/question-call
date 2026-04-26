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
      console.log("[GET /api/notices] No session, returning empty array");
      return NextResponse.json([]);
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select("seenNotices role email createdAt");
    if (!user) {
      console.log("[GET /api/notices] User not found in DB");
      return NextResponse.json([]);
    }

    console.log("[GET /api/notices] User:", user.email, "Role:", user.role, "Seen:", user.seenNotices);

    const seenNotices = user.seenNotices || [];

    // Determine when the user joined. If createdAt is missing or invalid,
    // fall back to the current moment so no old notices leak to new accounts.
    let joinedAt: Date;
    if (user.createdAt instanceof Date && !Number.isNaN(user.createdAt.getTime())) {
      joinedAt = user.createdAt;
    } else if (user.createdAt) {
      const parsed = new Date(user.createdAt);
      joinedAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      joinedAt = new Date();
    }

    console.log("[GET /api/notices] joinedAt:", joinedAt.toISOString());

    // Base query: isActive, not expired, created after user joined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {
      isActive: true,
      _id: { $nin: seenNotices },
      createdAt: { $gte: joinedAt },
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

    const notices = await Notice.find(query).sort({ createdAt: 1 });

    console.log("[GET /api/notices] Query:", JSON.stringify(query), "Found:", notices.length);
    
    return NextResponse.json(notices);
  } catch (error) {
    console.error("[GET /api/notices]", error);
    return NextResponse.json(
      { error: "Failed to fetch notices." },
      { status: 500 }
    );
  }
}
