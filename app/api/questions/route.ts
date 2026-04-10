import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionCreated } from "@/lib/pusher/pusherServer";
import Question from "@/models/Question";
import User from "@/models/User";
import type { CreateQuestionPayload, FeedQuestion } from "@/types/question";
import { getPlatformConfig } from "@/models/PlatformConfig";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can post questions" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateQuestionPayload;

    if (!body.title || body.title.trim().length < 6 || body.title.trim().length > 180) {
      return NextResponse.json(
        { error: "Title must be between 6 and 180 characters" },
        { status: 400 },
      );
    }

    if (!body.body || body.body.trim().length < 12 || body.body.trim().length > 5000) {
      return NextResponse.json(
        { error: "Body must be between 12 and 5000 characters" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const config = await getPlatformConfig();
    const trialDays = config.trialDays;

    // Subscription Check Logic
    const now = new Date();
    const subEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
    
    // If they have used their trial and their subscription end date is missing or passed
    if (user.trialUsed && (!subEnd || subEnd < now)) {
      if (user.subscriptionStatus !== "EXPIRED") {
        await User.findByIdAndUpdate(user._id, { subscriptionStatus: "EXPIRED" });
      }
      return NextResponse.json(
        { error: "Subscription expired. Please renew to ask questions." },
        { status: 403 },
      );
    }
    
    // Auto-start trial on first question if not used yet and no active sub
    if (!user.trialUsed && user.subscriptionStatus !== "ACTIVE") {
      const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(user._id, {
        trialUsed: true,
        subscriptionStatus: "ACTIVE", // Active as it is basically active but trial
        subscriptionEnd: trialEnd,
      });
    }

    const question = await Question.create({
      askerId: session.user.id,
      title: body.title.trim(),
      body: body.body.trim(),
      images: Array.isArray(body.images) ? body.images : [],
      answerFormat: body.answerFormat || "ANY",
      answerVisibility: body.answerVisibility || "PUBLIC",
      subject: body.subject?.trim() || undefined,
      stream: body.stream?.trim() || undefined,
      level: body.level?.trim() || undefined,
    });

    // Increment the user's totalAsked counter
    await User.findByIdAndUpdate(session.user.id, { $inc: { totalAsked: 1 } });

    // Build the FeedQuestion shape to broadcast + return
    const feedQuestion: FeedQuestion = {
      id: question._id.toString(),
      askerId: session.user.id,
      askerName: session.user.name || "Anonymous",
      askerUsername: session.user.username || undefined,
      title: question.title,
      body: question.body,
      images: question.images || [],
      answerFormat: question.answerFormat,
      answerVisibility: question.answerVisibility,
      status: question.status,
      subject: question.subject || undefined,
      stream: question.stream || undefined,
      level: question.level || undefined,
      resetCount: question.resetCount,
      reactions: [],
      answerCount: 0,
      reactionCount: 0,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };

    // Broadcast to all connected clients via Pusher
    await emitQuestionCreated(feedQuestion).catch(() => {
      // Pusher broadcast failure is non-fatal
    });

    return NextResponse.json(feedQuestion, { status: 201 });
  } catch (error) {
    console.error("[POST /api/questions]", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 },
    );
  }
}
