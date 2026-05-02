/**
 * Daily target tracking helper.
 *
 * Increments the teacher's `dailyAnswersCount` for today,
 * resets to 1 if the last-answered date is a different day,
 * and awards bonus NPR if they cross an admin-configured target threshold.
 *
 * This function is called from:
 *  - POST /api/channels/[id]/close  (student-initiated close, any rating)
 *  - processExpiredChannels          (auto-close cron)
 */

import { emitNotification } from "@/lib/pusher/pusherServer";
import { recordWalletHistoryEvent } from "@/lib/wallet-history";
import Notification from "@/models/Notification";
import User from "@/models/User";
import type { PlatformConfigDocument } from "@/models/PlatformConfig";

type DailyTarget = {
  target: number;
  bonus: number;
};

type IncrementDailyTargetResult = {
  dailyAnswersCount: number;
  bonusAwarded: number;
  targetsHit: number[];
};

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Increment the teacher's daily answer count and award bonuses if targets are met.
 *
 * NOTE: The daily count is incremented for ALL teachers (monetized or not) so the
 * sidebar progress bar stays accurate. Bonus NPR is only awarded if `isMonetized`.
 */
export async function incrementDailyTargetCount(
  teacherId: string,
  config: PlatformConfigDocument,
): Promise<IncrementDailyTargetResult | null> {
  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== "TEACHER") return null;

  const now = new Date();
  const lastAns = teacher.lastAnsweredDate
    ? new Date(teacher.lastAnsweredDate)
    : null;
  const isToday = lastAns && isSameCalendarDay(lastAns, now);

  if (!isToday) {
    teacher.dailyAnswersCount = 0;
    teacher.dailyTargetsAchieved = [];
    teacher.lastAnsweredDate = now;
  }

  teacher.dailyAnswersCount += 1;

  // --- Bonus awarding (only for monetized teachers) ---
  const dailyTargets: DailyTarget[] =
    (config as any).dailyTargets ?? [];
  let bonusAwarded = 0;
  const targetsHit: number[] = [];

  if (teacher.isMonetized && dailyTargets.length > 0) {
    for (const t of dailyTargets) {
      if (
        teacher.dailyAnswersCount >= t.target &&
        !teacher.dailyTargetsAchieved.includes(t.target)
      ) {
        bonusAwarded += t.bonus;
        targetsHit.push(t.target);
        teacher.dailyTargetsAchieved.push(t.target);
      }
    }

    if (bonusAwarded > 0) {
      teacher.pointBalance += bonusAwarded;
      teacher.totalPointsEarned += bonusAwarded;

      await recordWalletHistoryEvent({
        userId: teacher._id,
        type: "DAILY_TARGET_BONUS",
        title: "Daily Target Bonus",
        description: `Bonus for solving ${teacher.dailyAnswersCount} questions today (targets: ${targetsHit.join(", ")}).`,
        pointsDelta: bonusAwarded,
        metadata: {
          dailyAnswersCount: teacher.dailyAnswersCount,
          targetsHit,
          bonusAwarded,
        },
      }).catch((err) => {
        console.error("[daily-targets] Failed to record bonus event", err);
      });

      const notif = await Notification.create({
        userId: teacher._id,
        type: "DAILY_TARGET_BONUS",
        message: `🎯 You hit your daily target! +${bonusAwarded} NPR bonus for solving ${targetsHit.join(", ")} questions today.`,
        href: "/wallet",
      }).catch(() => null);

      if (notif) {
        await emitNotification(teacher._id.toString(), notif).catch(() => {});
      }
    }
  }

  await teacher.save();

  return {
    dailyAnswersCount: teacher.dailyAnswersCount,
    bonusAwarded,
    targetsHit,
  };
}
