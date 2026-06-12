import { NextRequest, NextResponse, after } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import { notifyUser } from "@/lib/notifications/notify-user";
import User from "@/models/User";

export const dynamic = "force-dynamic";

async function resolveTeacher(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    return { error: "Invalid teacher id." as const, status: 400 };
  }

  const teacher = await User.findById(id).select("role").lean<{
    _id: Types.ObjectId;
    role: string;
  }>();

  if (!teacher || teacher.role !== "TEACHER") {
    return { error: "Teacher not found." as const, status: 404 };
  }

  return { teacher };
}

// POST /api/teachers/:id/follow — follow the teacher.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (id === authUser.id) {
      return NextResponse.json(
        { error: "You cannot follow yourself." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const resolved = await resolveTeacher(id);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    await User.findByIdAndUpdate(authUser.id, {
      $addToSet: { following: id },
    });

    const followerCount = await User.countDocuments({ following: id });

    // Notify the teacher that someone followed them. after() guarantees it runs
    // post-response on serverless. href → /user/:id (the follower's profile).
    after(async () => {
      await notifyUser({
        userId: id,
        type: "NEW_FOLLOWER",
        message: `${authUser.name} started following you`,
        href: `/user/${authUser.id}`,
      });
    });

    return NextResponse.json({ following: true, followerCount });
  } catch (error) {
    console.error("[POST /api/teachers/:id/follow]", error);
    return NextResponse.json(
      { error: "Failed to follow teacher." },
      { status: 500 },
    );
  }
}

// DELETE /api/teachers/:id/follow — unfollow the teacher.
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid teacher id." }, { status: 400 });
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(authUser.id, {
      $pull: { following: id },
    });

    const followerCount = await User.countDocuments({ following: id });

    return NextResponse.json({ following: false, followerCount });
  } catch (error) {
    console.error("[DELETE /api/teachers/:id/follow]", error);
    return NextResponse.json(
      { error: "Failed to unfollow teacher." },
      { status: 500 },
    );
  }
}
