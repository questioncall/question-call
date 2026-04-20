import { NextResponse } from "next/server";

import { calcTotalPointsEarned } from "@/lib/points";
import { connectToDatabase } from "@/lib/mongodb";
import {
  emitQuestionUpdated,
  emitChannelStatusUpdate,
  emitNotification,
} from "@/lib/pusher/pusherServer";
import Answer from "@/models/Answer";
import Channel from "@/models/Channel";
import Notification from "@/models/Notification";
import { getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";
import type { FeedQuestion } from "@/types/question";

const BAYESIAN_SEED_VOTES = 5;
const BAYESIAN_SEED_SCORE = 1;

type PopulatedQuestion = {
  _id: { toString(): string };
  askerId?: { toString(): string } | string | null;
  title: string;
  body: string;
  answerFormat: FeedQuestion["answerFormat"];
  answerVisibility: FeedQuestion["answerVisibility"];
  subject?: string;
  stream?: string;
  level?: string;
  resetCount: number;
  reactions?: Array<{
    userId?: { toString(): string } | string | null;
    type: string;
  }>;
  acceptedById?: { toString(): string } | string | null;
  acceptedAt?: Date | null;
  answerId?: { toString(): string } | string | null;
  createdAt: Date;
  updatedAt: Date;
  status: FeedQuestion["status"];
  save: () => Promise<unknown>;
};

function buildTeacherPenaltyUpdatePipeline(penalty: number) {
  return [
    {
      $set: {
        pointBalance: {
          $max: [
            0,
            {
              $subtract: [{ $ifNull: ["$pointBalance", 0] }, penalty],
            },
          ],
        },
        totalPenaltyPoints: {
          $add: [{ $ifNull: ["$totalPenaltyPoints", 0] }, penalty],
        },
      },
    },
  ];
}

/** Apply Bayesian rating to teacher. Seed: 5 votes of 1.0 for bottom-up growth. */
async function applyBayesianRating({
  teacherId,
  rating,
  pointsEarned,
  qualificationThreshold,
}: {
  teacherId: string;
  rating: number;
  pointsEarned: number;
  qualificationThreshold: number;
}) {
  await User.findByIdAndUpdate(teacherId, [
    {
      $set: {
        overallRatingSum: {
          $add: [{ $ifNull: ["$overallRatingSum", 0] }, rating],
        },
        overallRatingCount: {
          $add: [{ $ifNull: ["$overallRatingCount", 0] }, 1],
        },
        ...(pointsEarned > 0
          ? {
              pointBalance: {
                $add: [{ $ifNull: ["$pointBalance", 0] }, pointsEarned],
              },
              totalPointsEarned: {
                $add: [{ $ifNull: ["$totalPointsEarned", 0] }, pointsEarned],
              },
            }
          : {}),
        teacherModeVerified: {
          $or: [
            { $ifNull: ["$teacherModeVerified", false] },
            {
              $gte: [{ $ifNull: ["$totalAnswered", 0] }, qualificationThreshold],
            },
          ],
        },
      },
    },
    {
      $set: {
        overallScore: {
          $divide: [
            {
              $add: [
                BAYESIAN_SEED_SCORE * BAYESIAN_SEED_VOTES,
                "$overallRatingSum",
              ],
            },
            {
              $add: [BAYESIAN_SEED_VOTES, "$overallRatingCount"],
            },
          ],
        },
      },
    },
  ]);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cronKey = searchParams.get("key");

    // Allow header auth OR query param auth
    const headerSecret =
      request.headers.get("x-cron-secret") ||
      request.headers.get("authorization");
    const validSecret = process.env.CRON_SECRET;

    if (
      headerSecret !== validSecret &&
      headerSecret !== `Bearer ${validSecret}` &&
      cronKey !== validSecret
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const config = await getPlatformConfig();

    const now = new Date();
    const autoCloseGrace = new Date(now.getTime() - 30 * 60 * 1000); // 30 min grace after deadline
    const maxResets = config.maxQuestionResetCount || 3;

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

        const question = channel.questionId as PopulatedQuestion | null;
        if (question) {
          question.status = "SOLVED";
          if (existingAnswer.isPublic) question.answerId = existingAnswer._id;
          await question.save();

          await emitQuestionUpdated({
            id: question._id.toString(),
            channelId: channel._id.toString(),
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
            commentCount: 0,
            createdAt: new Date(question.createdAt).toISOString(),
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        const teacher = await User.findById(channel.acceptorId._id)
          .select("_id isMonetized")
          .lean();
        const pointsEarned =
          teacher?.isMonetized && existingAnswer
            ? calcTotalPointsEarned(
                existingAnswer.answerFormat,
                AUTO_CLOSE_RATING,
                config,
              )
            : 0;

        await applyBayesianRating({
          teacherId: channel.acceptorId._id.toString(),
          rating: AUTO_CLOSE_RATING,
          pointsEarned,
          qualificationThreshold: config.qualificationThreshold,
        });

        const teacherNotif = await Notification.create({
          userId: channel.acceptorId._id,
          type: "RATING_RECEIVED",
          message:
            pointsEarned > 0
              ? `Auto-reviewed: You received ${AUTO_CLOSE_RATING}/5 stars (asker didn't rate in time). Points credited automatically.`
              : `Auto-reviewed: You received ${AUTO_CLOSE_RATING}/5 stars (asker didn't rate in time).`,
        }).catch(() => null);
        if (teacherNotif) {
          await emitNotification(channel.acceptorId._id.toString(), teacherNotif);
        }

        const askerNotif = await Notification.create({
          userId: channel.askerId,
          type: "CHANNEL_CLOSED",
          message: `Your channel was auto-closed. The teacher's answer was rated ${AUTO_CLOSE_RATING}/5 automatically.`,
        }).catch(() => null);
        if (askerNotif) await emitNotification(channel.askerId.toString(), askerNotif);

        await emitChannelStatusUpdate(channel._id.toString(), "CLOSED").catch(
          () => {},
        );

        autoClosedCount++;
        continue;
      }

      // ─ No answer submitted → EXPIRE with penalty rating (1/5) ─
      channel.status = "EXPIRED";
      channel.closedAt = now;
      channel.ratingGiven = 1;
      await channel.save();

      const penalty = config.scoreDeductionAmount || 1;
      const teacher = await User.findById(channel.acceptorId._id);
      if (teacher) {
        await User.findByIdAndUpdate(
          teacher._id,
          buildTeacherPenaltyUpdatePipeline(penalty),
        );
      }

      const penaltyNotif = await Notification.create({
        userId: channel.acceptorId._id,
        type: "QUESTION_RESET",
        message: `You did not submit an answer in time. ${penalty} point(s) deducted.`,
      }).catch(() => null);
      if (penaltyNotif) {
        await emitNotification(channel.acceptorId._id.toString(), penaltyNotif);
      }

      // Reset the question back to OPEN feed
      const question = channel.questionId as PopulatedQuestion | null;
      if (question) {
        const currentResetCount = question.resetCount || 0;

        if (currentResetCount < maxResets) {
          question.status = "RESET";
          question.acceptedById = null;
          question.acceptedAt = null;
          question.resetCount = currentResetCount + 1;
          await question.save();

          const asker = channel.askerId as unknown as {
            _id: { toString(): string };
            name?: string;
            username?: string;
            userImage?: string;
          };

          const reactions = Array.isArray(question.reactions)
            ? question.reactions
            : [];

          const feedQuestion: FeedQuestion = {
            id: question._id.toString(),
            channelId: channel._id.toString(),
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
            reactions: reactions.map(
              (r: { userId?: { toString(): string } | string | null; type: string }) => ({
                userId: r.userId?.toString() || "",
                type: r.type as "like" | "insightful" | "same_doubt",
              }),
            ),
            acceptedById: null,
            acceptedAt: null,
            acceptedByName: null,
            answerCount: 0,
            reactionCount: reactions.length,
            commentCount: 0,
            createdAt: new Date(question.createdAt).toISOString(),
            updatedAt: new Date(question.updatedAt).toISOString(),
          };

          await emitQuestionUpdated(feedQuestion).catch(() => {});

          const reopenNotif = await Notification.create({
            userId: channel.askerId._id,
            type: "QUESTION_RESET",
            message: `Teacher didn't answer in time. Your question has been re-opened. (${question.resetCount}/${maxResets} attempts)`,
          }).catch(() => null);
          if (reopenNotif) {
            await emitNotification(channel.askerId._id.toString(), reopenNotif);
          }
        } else {
          question.status = "SOLVED";
          question.acceptedById = null;
          question.acceptedAt = null;
          await question.save();

          const maxReachedNotif = await Notification.create({
            userId: channel.askerId._id,
            type: "CHANNEL_EXPIRED",
            message: `Question auto-marked as solved after ${maxResets} attempts.`,
          }).catch(() => null);
          if (maxReachedNotif) {
            await emitNotification(channel.askerId._id.toString(), maxReachedNotif);
          }
        }
      }

      await emitChannelStatusUpdate(channel._id.toString(), "EXPIRED").catch(
        () => {},
      );

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
