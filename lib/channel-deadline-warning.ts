import Channel from "@/models/Channel";
import Notification from "@/models/Notification";
import { emitNotification } from "@/lib/pusher/pusherServer";
import { normalizeIdLike } from "@/lib/call-utils";
import {
  CHANNEL_WARNING_THRESHOLD_MS,
  getChannelTimeRemainingMs,
} from "@/lib/channel-timer";

type DeadlineWarningInput = {
  channelId: string;
  acceptorId: string;
  status: string;
  timerDeadline: Date | string;
  hasAnswerSubmitted: boolean;
};

export async function emitDeadlineWarningIfNeeded({
  channelId,
  acceptorId,
  status,
  timerDeadline,
  hasAnswerSubmitted,
}: DeadlineWarningInput) {
  if (status !== "ACTIVE" || hasAnswerSubmitted) {
    return;
  }

  const remainingMs = getChannelTimeRemainingMs(timerDeadline);
  if (
    remainingMs <= 0 ||
    remainingMs > CHANNEL_WARNING_THRESHOLD_MS ||
    !normalizeIdLike(acceptorId)
  ) {
    return;
  }

  const warningClaim = await Channel.findOneAndUpdate(
    {
      _id: channelId,
      status: "ACTIVE",
      lastDeadlineWarningAt: null,
    },
    {
      $set: { lastDeadlineWarningAt: new Date() },
    },
    {
      new: false,
    },
  )
    .select("_id")
    .lean();

  if (!warningClaim) {
    return;
  }

  const warningMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const notification = await Notification.create({
    userId: acceptorId,
    type: "DEADLINE_WARNING",
    message:
      warningMinutes === 1
        ? "Only 1 minute is left to finish this answer."
        : `Only ${warningMinutes} minutes are left to finish this answer.`,
  }).catch(() => null);

  if (notification) {
    await emitNotification(acceptorId, notification).catch(console.error);
  }
}
