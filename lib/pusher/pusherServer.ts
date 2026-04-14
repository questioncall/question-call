import Pusher from "pusher";

import type { FeedQuestion } from "@/lib/question-types";
import type { ChatMessage, ChannelStatus } from "@/types/channel";
import {
  QUESTION_CREATED_EVENT,
  QUESTION_FEED_CHANNEL,
  QUESTION_UPDATED_EVENT,
  CHANNEL_MESSAGE_EVENT,
  CHANNEL_STATUS_EVENT,
  CHANNEL_MESSAGES_SEEN_EVENT,
  NEW_CHANNEL_EVENT,
  COURSE_UPDATED_EVENT,
  COURSE_UPDATES_CHANNEL,
  getChannelPusherName,
  getUserPusherName,
  NOTIFICATION_EVENT,
  SUBSCRIPTION_UPDATED_EVENT,
} from "@/lib/pusher/events";

type PusherPayload = Record<string, unknown>;
type RealtimeNotification = {
  _id: { toString(): string };
  type: string;
  message: string;
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

/** Broadcast a notification to a specific user */
export async function emitNotification(
  userId: string,
  notification: RealtimeNotification,
) {
  const pusherChannel = getUserPusherName(userId);
  await pusherServer.trigger(pusherChannel, NOTIFICATION_EVENT, {
    notification: {
      id: notification._id.toString(),
      type: notification.type,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: new Date(notification.createdAt).toISOString(),
    },
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

/** Broadcast an incoming call to a specific user */
export async function emitIncomingCall(
  targetUserId: string,
  payload: {
    callSessionId: string;
    channelId: string;
    callerName: string;
    mode: "AUDIO" | "VIDEO";
  },
) {
  const pusherChannel = getChannelPusherName(payload.channelId);
  const { CALL_INCOMING_EVENT } = await import("@/lib/pusher/events");
  await pusherServer.trigger(pusherChannel, CALL_INCOMING_EVENT, {
    ...payload,
    targetUserId,
  });
}

/** Broadcast a call status event (accepted/rejected/ended) on the channel */
export async function emitCallEvent(
  channelId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const pusherChannel = getChannelPusherName(channelId);
  await pusherServer.trigger(pusherChannel, event, payload);
}
