import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionUpdated, emitChannelStatusUpdate } from "@/lib/pusher/pusherServer";
import Channel from "@/models/Channel";
import Question from "@/models/Question";
import User from "@/models/User";
import type { FeedQuestion } from "@/types/question";

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization");

    if (cronSecret !== process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();

    // Find ACTIVE channels that have passed their deadline
    const expiredChannels = await Channel.find({
      status: "ACTIVE",
      timerDeadline: { $lt: now },
    })
      .populate("questionId")
      .populate("askerId", "name username userImage")
      .populate("acceptorId", "name username overallScore");

    let expiredCount = 0;

    for (const channel of expiredChannels) {
      // Mark channel as EXPIRED
      channel.status = "EXPIRED";
      channel.closedAt = now;
      await channel.save();

      // Deduct score from acceptor
      const scoreDeduction = 5; // TODO: read from PlatformConfig
      await User.findByIdAndUpdate(channel.acceptorId._id, {
        $inc: { overallScore: -scoreDeduction },
      });

      // Reset the question
      const question = channel.questionId as any;
      if (question) {
        question.status = "RESET";
        question.acceptedById = null;
        question.acceptedAt = null;
        question.resetCount = (question.resetCount || 0) + 1;
        await question.save();

        // Build FeedQuestion to broadcast the reset
        const asker = channel.askerId as unknown as {
          _id: { toString(): string };
          name?: string;
          username?: string;
          userImage?: string;
        };

        const reactions = Array.isArray(question.reactions) ? question.reactions : [];

        const feedQuestion: FeedQuestion = {
          id: question._id.toString(),
          askerId: asker._id.toString(),
          askerName: asker.name || "Anonymous",
          askerUsername: asker.username || undefined,
          askerImage: asker.userImage || undefined,
          title: question.title,
          body: question.body,
          tier: question.tier,
          answerVisibility: question.answerVisibility,
          status: "RESET",
          subject: question.subject || undefined,
          stream: question.stream || undefined,
          level: question.level || undefined,
          resetCount: question.resetCount,
          reactions: reactions.map((r: { userId: { toString(): string }; type: string }) => ({
            userId: r.userId?.toString() || "",
            type: r.type as "like" | "insightful" | "same_doubt",
          })),
          acceptedById: null,
          acceptedAt: null,
          acceptedByName: null,
          answerCount: 0,
          reactionCount: reactions.length,
          createdAt: new Date(question.createdAt).toISOString(),
          updatedAt: new Date(question.updatedAt).toISOString(),
        };

        await emitQuestionUpdated(feedQuestion).catch(() => {});
      }

      // Broadcast channel status change
      await emitChannelStatusUpdate(channel._id.toString(), "EXPIRED").catch(() => {});

      // TODO: Phase 5 — Create notifications for both asker and acceptor

      expiredCount++;
    }

    return NextResponse.json({
      message: `Processed ${expiredCount} expired channel(s)`,
      expiredCount,
    });
  } catch (error) {
    console.error("[POST /api/cron/expire-channels]", error);
    return NextResponse.json(
      { error: "Failed to process expired channels" },
      { status: 500 },
    );
  }
}
