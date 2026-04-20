import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { emitNotification } from "@/lib/pusher/pusherServer";
import Notification from "@/models/Notification";
import { getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";

/**
 * Monthly Teacher Rewards Cron
 *
 * Run on the 1st of every month to automatically award bonus points
 * to teachers who maintain a high overall rating (≥ 4 stars average).
 *
 * Endpoint: POST /api/cron/monthly-rewards
 * Auth: x-cron-secret or authorization header must match CRON_SECRET env var.
 */
export async function POST(request: Request) {
  try {
    const cronSecret =
      request.headers.get("x-cron-secret") ||
      request.headers.get("authorization");

    if (
      cronSecret !== process.env.CRON_SECRET &&
      cronSecret !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const config = await getPlatformConfig();

    const bonusPoints = config.monthlyHighScoreBonusPoints;
    if (!bonusPoints || bonusPoints <= 0) {
      return NextResponse.json({
        message: "Monthly bonus is disabled (0 points configured).",
        rewardedCount: 0,
      });
    }

    // Find all monetized teachers with an average rating >= 4.0 who haven't
    // already claimed the bonus this calendar month.
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const eligibleTeachers = await User.find({
      role: "TEACHER",
      isMonetized: true,
      isSuspended: { $ne: true },
      overallRatingCount: { $gt: 0 },
      $or: [
        { monthlyBonusClaimedAt: null },
        { monthlyBonusClaimedAt: { $lt: startOfMonth } },
      ],
    }).select(
      "_id name overallRatingSum overallRatingCount pointBalance monthlyBonusClaimedAt"
    );

    let rewardedCount = 0;

    for (const teacher of eligibleTeachers) {
      const avgRating =
        teacher.overallRatingCount > 0
          ? teacher.overallRatingSum / teacher.overallRatingCount
          : 0;

      if (avgRating < 4.0) continue;

      const rewardedTeacher = await User.findOneAndUpdate(
        {
          _id: teacher._id,
          $or: [
            { monthlyBonusClaimedAt: null },
            { monthlyBonusClaimedAt: { $lt: startOfMonth } },
          ],
        },
        [
          {
            $set: {
              pointBalance: {
                $add: [{ $ifNull: ["$pointBalance", 0] }, bonusPoints],
              },
              totalPointsEarned: {
                $add: [{ $ifNull: ["$totalPointsEarned", 0] }, bonusPoints],
              },
              monthlyBonusClaimedAt: now,
            },
          },
        ],
        { new: true },
      );

      if (!rewardedTeacher) continue;

      // Notify teacher
      const notif = await Notification.create({
        userId: teacher._id,
        type: "PAYMENT",
        message: `🎉 Monthly bonus! You earned ${bonusPoints} bonus point(s) for maintaining a high rating (${avgRating.toFixed(1)}★). Keep it up!`,
        isRead: false,
      }).catch(() => null);

      if (notif) {
        await emitNotification(teacher._id.toString(), notif).catch(() => {});
      }

      rewardedCount++;
    }

    return NextResponse.json({
      message: `Monthly rewards processed. ${rewardedCount} teacher(s) rewarded.`,
      rewardedCount,
      bonusPointsPerTeacher: bonusPoints,
    });
  } catch (error) {
    console.error("[POST /api/cron/monthly-rewards]", error);
    return NextResponse.json(
      { error: "Failed to process monthly rewards" },
      { status: 500 }
    );
  }
}
