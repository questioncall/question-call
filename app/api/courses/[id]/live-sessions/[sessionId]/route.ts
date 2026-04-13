import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import {
  checkCourseAccess,
  checkCourseManagementAccess,
} from "@/lib/course-access";
import { connectToDatabase } from "@/lib/mongodb";
import CourseSection from "@/models/CourseSection";
import LiveSession from "@/models/LiveSession";

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["LIVE"],
  LIVE: ["ENDED"],
  ENDED: [],
  CANCELLED: [],
};

function parseOptionalDuration(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function canTransitionStatus(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (nextStatus === "CANCELLED") {
    return true;
  }

  return VALID_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json(
        { error: "Invalid course or live session id." },
        { status: 400 },
      );
    }

    const canAccess = await checkCourseAccess(session.user.id, id);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const liveSession = await LiveSession.findOne({
      _id: sessionId,
      courseId: id,
    }).lean();

    if (!liveSession) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    return NextResponse.json(liveSession);
  } catch (error) {
    console.error("[GET /api/courses/:id/live-sessions/:sessionId]", error);
    return NextResponse.json(
      { error: "Failed to load live session." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json(
        { error: "Invalid course or live session id." },
        { status: 400 },
      );
    }

    const canManage = await checkCourseManagementAccess(session.user.id, id);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const liveSession = await LiveSession.findOne({
      _id: sessionId,
      courseId: id,
    });

    if (!liveSession) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    const body = await request.json();

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
      }
      liveSession.title = title;
    }

    if (typeof body.scheduledAt === "string") {
      const scheduledAt = new Date(body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ error: "Invalid scheduledAt." }, { status: 400 });
      }
      liveSession.scheduledAt = scheduledAt;
    }

    if ("durationMinutes" in body) {
      const durationMinutes = parseOptionalDuration(body.durationMinutes);
      if (Number.isNaN(durationMinutes)) {
        return NextResponse.json(
          { error: "durationMinutes must be a non-negative number." },
          { status: 400 },
        );
      }
      liveSession.durationMinutes = durationMinutes;
    }

    if ("sectionId" in body) {
      if (body.sectionId === null || body.sectionId === "") {
        liveSession.sectionId = null;
      } else if (typeof body.sectionId === "string") {
        if (!Types.ObjectId.isValid(body.sectionId)) {
          return NextResponse.json({ error: "Invalid section id." }, { status: 400 });
        }

        const section = await CourseSection.findOne({
          _id: body.sectionId,
          courseId: id,
        })
          .select("_id")
          .lean();

        if (!section) {
          return NextResponse.json({ error: "Section not found." }, { status: 404 });
        }

        liveSession.sectionId = section._id;
      }
    }

    if ("zoomLink" in body) {
      if (body.zoomLink === null || body.zoomLink === "") {
        liveSession.zoomLink = null;
      } else if (typeof body.zoomLink === "string") {
        liveSession.zoomLink = body.zoomLink.trim();
      }
    }

    if (typeof body.status === "string") {
      if (!canTransitionStatus(liveSession.status, body.status)) {
        return NextResponse.json(
          {
            error: `Invalid live session status transition from ${liveSession.status} to ${body.status}.`,
          },
          { status: 400 },
        );
      }

      liveSession.status = body.status;
    }

    await liveSession.save();

    return NextResponse.json(liveSession);
  } catch (error) {
    console.error("[PATCH /api/courses/:id/live-sessions/:sessionId]", error);
    return NextResponse.json(
      { error: "Failed to update live session." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json(
        { error: "Invalid course or live session id." },
        { status: 400 },
      );
    }

    const canManage = await checkCourseManagementAccess(session.user.id, id);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const liveSession = await LiveSession.findOne({
      _id: sessionId,
      courseId: id,
    });

    if (!liveSession) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    liveSession.status = "CANCELLED";
    await liveSession.save();

    return NextResponse.json({ cancelled: true, sessionId });
  } catch (error) {
    console.error("[DELETE /api/courses/:id/live-sessions/:sessionId]", error);
    return NextResponse.json(
      { error: "Failed to cancel live session." },
      { status: 500 },
    );
  }
}
