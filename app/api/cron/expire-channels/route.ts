import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionUpdated, emitChannelStatusUpdate, emitNotification } from "@/lib/pusher/pusherServer";
import Channel from "@/models/Channel";
import Question from "@/models/Question";
import User from "@/models/User";
import Answer from "@/models/Answer";
import Notification from "@/models/Notification";
import type { FeedQuestion } from "@/types/question";

/** Apply Bayesian rating to teacher. Seed: 5 votes of 1.0 for bottom-up growth. */
async function applyBayesianRating(teacherId: string, rating: number) {
  const teacher = await User.findById(teacherId);
  if (!teacher) return;

  teacher.totalAnswered = (teacher.totalAnswered || 0) + 1;

  // Update new Phase 7 rating tracking fields
  teacher.overallRatingSum = (teacher.overallRatingSum || 0) + rating;
  teacher.overallRatingCount = (teacher.overallRatingCount || 0) + 1;

  // Legacy overallScore (Bayesian average for backward compat)
  const currentScore = teacher.overallScore || 0;
  const totalRatings = teacher.totalAnswered - 1;
  const seedVotes = 5;
  const seedScore = 1.0;

  const accumulated = seedScore * seedVotes + currentScore * totalRatings + rating;
  teacher.overallScore = accumulated / (seedVotes + teacher.totalAnswered);

  await teacher.save();
}

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization");

    if (cronSecret !== process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();
    const autoCloseGrace = new Date(now.getTime() - 30 * 60 * 1000); // 30 min grace after deadline

    // ─── Pass 1: Channels past deadline ─────────────────────────────────────────
    const expiredChannels = await Channel.find({
      status: "ACTIVE",
      timerDeadline: { $lt: now },
    })
      .populate("questionId")
      .populate("askerId", "name username userImage")
      .populate("acceptorId", "name username overallScore totalAnswered");

    let expiredCount = 0;
    let autoClosedCount = 0;

    for (const channel of expiredChannels) {
      // Check if answer was submitted for this channel
      const existingAnswer = await Answer.findOne({ channelId: channel._id });

      if (existingAnswer) {
        // Has answer — only auto-close after 30min grace period
        const deadlinePassed30Min = channel.timerDeadline < autoCloseGrace;
        if (!deadlinePassed30Min) continue;

        // Auto-close with rating 3/5
        const AUTO_CLOSE_RATING = 3;
        channel.status = "CLOSED";
        channel.closedAt = now;
        channel.isClosedByAsker = false;
        channel.ratingGiven = AUTO_CLOSE_RATING;
        await channel.save();

        existingAnswer.rating = AUTO_CLOSE_RATING;
        await existingAnswer.save();

        const question = channel.questionId as any;
        if (question) {
          question.status = "SOLVED";
          if (existingAnswer.isPublic) question.answerId = existingAnswer._id;
          await question.save();

          await emitQuestionUpdated({
            id: question._id.toString(),
            askerId: question.askerId?.toString() || "",
            askerName: "",
            title: question.title,
            body: question.body,
            answerFormat: question.answerFormat,
            answerVisibility: question.answerVisibility,
            status: "SOLVED",
            subject: question.subject || undefined,
            stream: question.stream || undefined,
            level: question.level || undefined,
            resetCount: question.resetCount,
            reactions: [],
            acceptedById: null,
            acceptedAt: null,
            acceptedByName: null,
            answerCount: 1,
            reactionCount: 0,
            createdAt: new Date(question.createdAt).toISOString(),
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        await applyBayesianRating(channel.acceptorId._id.toString(), AUTO_CLOSE_RATING);

        const teacherNotif = await Notification.create({
          userId: channel.acceptorId._id,
          type: "RATING_RECEIVED",
          message: `Auto-reviewed: You received ${AUTO_CLOSE_RATING}/5 stars (asker didn't rate in time).`,
        }).catch(() => null);
        if (teacherNotif) await emitNotification(channel.acceptorId._id.toString(), teacherNotif);

        const askerNotif = await Notification.create({
          userId: channel.askerId,
          type: "CHANNEL_CLOSED",
          message: `Your channel was auto-closed. The teacher's answer was rated ${AUTO_CLOSE_RATING}/5 automatically.`,
        }).catch(() => null);
        if (askerNotif) await emitNotification(channel.askerId.toString(), askerNotif);

        await emitChannelStatusUpdate(channel._id.toString(), "CLOSED").catch(() => {});

        autoClosedCount++;
        continue;
      }

      // ─ No answer submitted → EXPIRE with penalty rating (1/5) ─
      channel.status = "EXPIRED";
      channel.closedAt = now;
      channel.ratingGiven = 1;
      await channel.save();

      // Bayesian penalty — 1 is the worst
      await applyBayesianRating(channel.acceptorId._id.toString(), 1);

      const penaltyNotif = await Notification.create({
        userId: channel.acceptorId._id,
        type: "QUESTION_RESET",
        message: `You did not submit an answer in time. Your rating has been penalized (1/5).`,
      }).catch(() => null);
      if (penaltyNotif) await emitNotification(channel.acceptorId._id.toString(), penaltyNotif);

      // Reset the question back to OPEN feed
      const question = channel.questionId as any;
      if (question) {
        question.status = "RESET";
        question.acceptedById = null;
        question.acceptedAt = null;
        question.resetCount = (question.resetCount || 0) + 1;
        await question.save();

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
          answerFormat: question.answerFormat,
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

      await emitChannelStatusUpdate(channel._id.toString(), "EXPIRED").catch(() => {});

      const reopenNotif = await Notification.create({
        userId: channel.askerId._id,
        type: "QUESTION_RESET",
        message: `The teacher didn't answer in time. Your question has been re-opened.`,
      }).catch(() => null);
      if (reopenNotif) await emitNotification(channel.askerId._id.toString(), reopenNotif);

      expiredCount++;
    }

    return NextResponse.json({
      message: `Processed ${expiredCount} expired channel(s), auto-closed ${autoClosedCount} channel(s).`,
      expiredCount,
      autoClosedCount,
    });
  } catch (error) {
    console.error("[POST /api/cron/expire-channels]", error);
    return NextResponse.json(
      { error: "Failed to process expired channels" },
      { status: 500 },
    );
  }
}
