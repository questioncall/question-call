import Pusher from "pusher";

import { auditCallPayload } from "@/lib/call-logging";
import type { FeedQuestion } from "@/lib/question-types";
import type { ChatMessage, ChannelStatus } from "@/types/channel";
import {
  QUESTION_CREATED_EVENT,
  QUESTION_FEED_CHANNEL,
  QUESTION_UPDATED_EVENT,
  CHANNEL_MESSAGE_EVENT,
  CHANNEL_STATUS_EVENT,
  CHANNEL_MESSAGES_SEEN_EVENT,
  MESSAGE_DELETED_EVENT,
  NEW_CHANNEL_EVENT,
  COURSE_UPDATED_EVENT,
  COURSE_UPDATES_CHANNEL,
  getChannelPusherName,
  CHANNEL_TIMER_UPDATED_EVENT,
  getUserPusherName,
  NOTIFICATION_EVENT,
  SUBSCRIPTION_UPDATED_EVENT,
} from "@/lib/pusher/events";
import { resolveNotificationHref } from "@/lib/notifications/metadata";
import { sendPushNotificationToUser } from "@/lib/push/web-push";

type PusherPayload = Record<string, unknown>;
type RealtimeNotification = {
  _id: { toString(): string };
  type: string;
  message: string;
  href?: string | null;
  isRead: boolean;
  createdAt: Date | string;
};

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function emitEvent(
  sessionId: string,
  event: string,
  data: PusherPayload,
) {
  const channel = `interview-${sessionId}`;
  await pusherServer.trigger(channel, event, data);
}

export async function emitQuestionCreated(question: FeedQuestion) {
  await pusherServer.trigger(QUESTION_FEED_CHANNEL, QUESTION_CREATED_EVENT, {
    question,
  });
}

export async function emitQuestionUpdated(question: FeedQuestion) {
  await pusherServer.trigger(QUESTION_FEED_CHANNEL, QUESTION_UPDATED_EVENT, {
    question,
  });
}

/** Broadcast a new message to all subscribers of a channel */
export async function emitChannelMessage(
  channelId: string,
  message: ChatMessage,
) {
  const pusherChannel = getChannelPusherName(channelId);
  await pusherServer.trigger(pusherChannel, CHANNEL_MESSAGE_EVENT, { message });
}

/** Broadcast that all messages up to this point have been seen */
export async function emitMessagesSeen(channelId: string, seenByUserId: string) {
  const pusherChannel = getChannelPusherName(channelId);
  await pusherServer.trigger(pusherChannel, CHANNEL_MESSAGES_SEEN_EVENT, { seenByUserId });
}

/** Broadcast a channel status change (CLOSED, EXPIRED) */
export async function emitChannelStatusUpdate(
  channelId: string,
  status: ChannelStatus,
  data?: PusherPayload,
) {
  const pusherChannel = getChannelPusherName(channelId);
  await pusherServer.trigger(pusherChannel, CHANNEL_STATUS_EVENT, {
    status,
    ...data,
  });
}

export async function emitChannelTimerUpdated(
  channelId: string,
  data: {
    timerDeadline: string;
    timeExtensionCount: number;
    extendedBy?: string;
    extendedByName?: string;
    extensionMinutes?: number;
  },
) {
  const pusherChannel = getChannelPusherName(channelId);
  await pusherServer.trigger(pusherChannel, CHANNEL_TIMER_UPDATED_EVENT, data);
}

/** Broadcast a notification to a specific user */
export async function emitNotification(
  userId: string,
  notification: RealtimeNotification,
) {
  const pusherChannel = getUserPusherName(userId);
  const payload = {
    id: notification._id.toString(),
    type: notification.type,
    message: notification.message,
    href: resolveNotificationHref(notification),
    isRead: notification.isRead,
    createdAt: new Date(notification.createdAt).toISOString(),
  };

  // Pusher (in-app real-time) is awaited — it drives the instant UI update.
  await pusherServer.trigger(pusherChannel, NOTIFICATION_EVENT, {
    notification: payload,
  });

  // Web Push (device notification) should be awaited so it doesn't get
  // frozen mid-flight in Next.js serverless functions.
  await sendPushNotificationToUser(userId, {
    type: notification.type,
    message: notification.message,
    href: payload.href,
  }).catch((error) => {
    console.error("[emitNotification] Web Push background send failed", error);
  });
}

/** Broadcast a new channel to a specific user */
export async function emitNewChannel(userId: string, channelListItem: PusherPayload) {
  const pusherChannel = getUserPusherName(userId);
  await pusherServer.trigger(pusherChannel, NEW_CHANNEL_EVENT, {
    channel: channelListItem,
  });
}

export async function emitCourseUpdated(data: PusherPayload = {}) {
  await pusherServer.trigger(COURSE_UPDATES_CHANNEL, COURSE_UPDATED_EVENT, {
    updatedAt: new Date().toISOString(),
    ...data,
  });
}

/** Broadcast subscription status update to a specific user */
export async function emitSubscriptionUpdated(
  userId: string,
  data: {
    subscriptionStatus: string;
    subscriptionEnd: string | null;
    planSlug: string;
    questionsAsked?: number;
  },
) {
  const pusherChannel = getUserPusherName(userId);
  await pusherServer.trigger(pusherChannel, SUBSCRIPTION_UPDATED_EVENT, data);
}

/** Broadcast an incoming call to a specific user (global — user channel) */
export async function emitIncomingCall(
  targetUserId: string,
  payload: {
    callSessionId: string;
    channelId: string;
    callerName: string;
    callerImage: string | null;
    callerId: string;
    mode: "AUDIO" | "VIDEO";
  },
) {
  const userPusherChannel = getUserPusherName(targetUserId);
  const { CALL_INCOMING_EVENT } = await import("@/lib/pusher/events");
  auditCallPayload(CALL_INCOMING_EVENT, payload, {
    targetUserId,
    channelId: payload.channelId,
    hasCallerImage: Boolean(payload.callerImage),
  });
  await pusherServer.trigger(userPusherChannel, CALL_INCOMING_EVENT, payload);
}

/** Broadcast a call lifecycle event (accepted/rejected/cancelled/missed) to a specific user */
export async function emitCallStatusToUser(
  targetUserId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const userPusherChannel = getUserPusherName(targetUserId);
  auditCallPayload(event, payload, {
    targetUserId,
  });
  await pusherServer.trigger(userPusherChannel, event, payload);
}

/** Broadcast that a message was soft-deleted on a channel */
export async function emitMessageDeleted(
  channelId: string,
  messageId: string,
  deletedBy: string,
) {
  const pusherChannel = getChannelPusherName(channelId);
  await pusherServer.trigger(pusherChannel, MESSAGE_DELETED_EVENT, {
    messageId,
    deletedBy,
  });
}
