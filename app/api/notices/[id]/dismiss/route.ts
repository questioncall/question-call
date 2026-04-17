import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Notice ID required" }, { status: 400 });
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(session.user.id, {
      $addToSet: { seenNotices: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/notices/[id]/dismiss]", error);
    return NextResponse.json(
      { error: "Failed to dismiss notice." },
      { status: 500 }
    );
  }
}
