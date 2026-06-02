import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import Chapter from "@/models/Chapter";
import ChapterContent from "@/models/ChapterContent";
import ChapterEnrollment from "@/models/ChapterEnrollment";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authenticatedUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can enroll in chapters." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid chapter id." }, { status: 400 });
    }

    await connectToDatabase();

    const chapter = await Chapter.findById(id).select(
      "_id pricingModel status enrollmentCount",
    );

    if (!chapter || chapter.status !== "ACTIVE") {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }

    const existingEnrollment = await ChapterEnrollment.findOne({
      chapterId: chapter._id,
      studentId: authenticatedUser.id,
    });

    if (existingEnrollment) {
      return NextResponse.json(
        {
          enrolled: true,
          accessType: existingEnrollment.accessType,
          enrollmentId: existingEnrollment._id,
        },
        { status: 200 },
      );
    }

    const totalContentCount = await ChapterContent.countDocuments({
      chapterId: chapter._id,
    });

    let accessType: "FREE" | "SUBSCRIPTION";

    if (chapter.pricingModel === "PAID") {
      return NextResponse.json(
        { error: "PAID_CHAPTER_USE_PURCHASE_FLOW" },
        { status: 400 },
      );
    } else if (chapter.pricingModel === "FREE") {
      accessType = "FREE";
    } else {
      const subscription = await getQuizSubscriptionSnapshot(authenticatedUser.id);
      if (subscription.subscriptionStatus !== "ACTIVE") {
        return NextResponse.json({ reason: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
      }
      accessType = "SUBSCRIPTION";
    }

    const enrollment = await ChapterEnrollment.create({
      chapterId: chapter._id,
      studentId: authenticatedUser.id,
      accessType,
      totalContentCount,
    });

    await Chapter.updateOne({ _id: chapter._id }, { $inc: { enrollmentCount: 1 } });

    return NextResponse.json(
      { enrolled: true, accessType, enrollmentId: enrollment._id },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[POST /api/chapters/:id/enroll]", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      const { id } = await params;
      const retryUser = await getAuthenticatedUser(request);
      const duplicate = await ChapterEnrollment.findOne({
        chapterId: id,
        studentId: retryUser?.id,
      });
      return NextResponse.json(
        {
          enrolled: true,
          accessType: duplicate?.accessType ?? null,
          enrollmentId: duplicate?._id ?? null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: "Failed to enroll in chapter." },
      { status: 500 },
    );
  }
}
