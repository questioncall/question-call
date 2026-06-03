import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import Course from "@/models/Course";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// POST /api/courses/:id/favourite — add this course to the user's favourites.
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
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    const course = await Course.exists({ _id: id });
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    await User.findByIdAndUpdate(authUser.id, {
      $addToSet: { favouriteCourses: id },
    });

    return NextResponse.json({ favourited: true });
  } catch (error) {
    console.error("[POST /api/courses/:id/favourite]", error);
    return NextResponse.json(
      { error: "Failed to favourite course." },
      { status: 500 },
    );
  }
}

// DELETE /api/courses/:id/favourite — remove this course from favourites.
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
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(authUser.id, {
      $pull: { favouriteCourses: id },
    });

    return NextResponse.json({ favourited: false });
  } catch (error) {
    console.error("[DELETE /api/courses/:id/favourite]", error);
    return NextResponse.json(
      { error: "Failed to remove favourite." },
      { status: 500 },
    );
  }
}
