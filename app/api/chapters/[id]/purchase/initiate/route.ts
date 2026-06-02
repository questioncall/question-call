import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import { pusherServer } from "@/lib/pusher/pusherServer";
import { ADMIN_UPDATES_CHANNEL } from "@/lib/pusher/events";
import { getPlatformConfig } from "@/models/PlatformConfig";
import Chapter from "@/models/Chapter";
import ChapterEnrollment from "@/models/ChapterEnrollment";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { sendTransactionEmail } from "@/lib/sendEmails/sendTransactionEmail";
import { getMasterAdminEmails } from "@/lib/user-directory";

cloudinary.config({ secure: true });

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

async function uploadScreenshot(file: File) {
  if (
    !process.env.CLOUDINARY_URL &&
    (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)
  ) {
    throw new Error("Server missing Cloudinary credentials.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "question_hub_chapter_payments", resource_type: "image" },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error || new Error("Screenshot upload failed."));
          return;
        }
        resolve(result.secure_url);
      },
    );
    uploadStream.end(buffer);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authenticatedUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can purchase chapters." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid chapter id." }, { status: 400 });
    }

    const formData = await request.formData();
    const transactionId =
      typeof formData.get("transactionId") === "string"
        ? String(formData.get("transactionId")).trim()
        : "";
    const transactorName =
      typeof formData.get("transactorName") === "string"
        ? String(formData.get("transactorName")).trim()
        : "";
    const screenshot = formData.get("screenshot");

    if (!transactionId || !transactorName) {
      return NextResponse.json(
        { error: "transactionId and transactorName are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const chapter = await Chapter.findById(id)
      .select("_id title instructorId pricingModel price status")
      .lean();

    if (!chapter || chapter.status !== "ACTIVE") {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }

    if (chapter.pricingModel !== "PAID" || !chapter.price || chapter.price <= 0) {
      return NextResponse.json(
        { error: "Only paid chapters can be purchased through this route." },
        { status: 400 },
      );
    }

    const instructorIdString = String(chapter.instructorId);
    const instructor = await User.findById(instructorIdString).select("role").lean();
    const isAdminChapter = instructor?.role === "ADMIN";

    const existingEnrollment = await ChapterEnrollment.findOne({
      chapterId: chapter._id,
      studentId: authenticatedUser.id,
    })
      .select("_id accessType")
      .lean();

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "CHAPTER_ALREADY_UNLOCKED", accessType: existingEnrollment.accessType },
        { status: 400 },
      );
    }

    const existingCompleted = await Transaction.findOne({
      transactionId,
      status: "COMPLETED",
    })
      .select("_id")
      .lean();

    if (existingCompleted) {
      return NextResponse.json(
        { error: "This transaction ID has already been verified and processed." },
        { status: 409 },
      );
    }

    let screenshotUrl: string | undefined;
    if (screenshot instanceof File && screenshot.size > 0) {
      screenshotUrl = await uploadScreenshot(screenshot);
    }

    const grossAmount = roundCurrency(Number(chapter.price ?? 0));
    const config = await getPlatformConfig();
    const commissionPercent = isAdminChapter
      ? 0
      : roundCurrency(config.coursePurchaseCommissionPercent ?? 0);
    const netAmount = roundCurrency(grossAmount * (1 - commissionPercent / 100));

    const baseMetadata = {
      chapterId: chapter._id.toString(),
      chapterName: chapter.title,
      instructorId: instructorIdString,
      pricingModel: chapter.pricingModel,
      grossAmount,
      commissionPercent,
      netAmount,
    };

    const existingPending = await Transaction.findOne({
      transactionId,
        userId: authenticatedUser.id,
      type: "CHAPTER_PURCHASE",
      status: "PENDING",
    });

    if (existingPending) {
      const existingChapterId = String(
        (existingPending.metadata as Record<string, unknown> | undefined)?.chapterId ??
          "",
      );

      if (existingChapterId && existingChapterId !== id) {
        return NextResponse.json(
          {
            error:
              "This transaction ID is already attached to another pending chapter purchase.",
          },
          { status: 409 },
        );
      }

      existingPending.amount = grossAmount;
      existingPending.transactorName = transactorName;
      existingPending.gateway = "MANUAL";
      existingPending.reference =
        existingPending.reference ||
        `CHAPTER-MANUAL-${chapter._id}-${authenticatedUser.id}-${Date.now()}`;
      existingPending.meta = {
        ...(existingPending.meta ?? {}),
        paymentChannel: "ESEWA_MANUAL",
      };
      existingPending.metadata = baseMetadata;
      if (screenshotUrl) {
        existingPending.screenshotUrl = screenshotUrl;
      }
      await existingPending.save();

      if (pusherServer) {
        await pusherServer
          .trigger(ADMIN_UPDATES_CHANNEL, "admin:manual-payment-submitted", {
            transactionId,
            type: "CHAPTER_PURCHASE",
            amount: grossAmount,
            userId: authenticatedUser.id,
          })
          .catch(console.error);
      }

      return NextResponse.json(
        {
          message: "Chapter payment updated successfully. We will verify it shortly.",
          transactionId: existingPending._id.toString(),
        },
        { status: 200 },
      );
    }

    const createdTransaction = await Transaction.create({
      userId: authenticatedUser.id,
      type: "CHAPTER_PURCHASE",
      amount: grossAmount,
      status: "PENDING",
      transactionId,
      transactorName,
      screenshotUrl,
      gateway: "MANUAL",
      reference: `CHAPTER-MANUAL-${chapter._id}-${authenticatedUser.id}-${Date.now()}`,
      meta: { paymentChannel: "ESEWA_MANUAL" },
      metadata: baseMetadata,
    });

    const masterAdminEmails = await getMasterAdminEmails();
    if (masterAdminEmails.length > 0) {
      void sendTransactionEmail(
        masterAdminEmails,
        "New Manual Chapter Purchase Initiated",
        `A student has initiated a manual payment for the chapter "${chapter.title}".${screenshotUrl ? ` Receipt: ${screenshotUrl}` : ""}`,
        createdTransaction.transactionId || transactionId,
        `NPR ${grossAmount}`,
        authenticatedUser.email ?? "Unknown",
      ).catch(console.error);
    }

    if (pusherServer) {
      await pusherServer
        .trigger(ADMIN_UPDATES_CHANNEL, "admin:manual-payment-submitted", {
          transactionId,
          type: "CHAPTER_PURCHASE",
          amount: grossAmount,
          userId: authenticatedUser.id,
        })
        .catch(console.error);
    }

    return NextResponse.json(
      {
        message: "Chapter payment submitted successfully. We will verify it shortly.",
        transactionId: createdTransaction._id.toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/chapters/:id/purchase/initiate]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initiate chapter purchase.",
      },
      { status: 500 },
    );
  }
}
