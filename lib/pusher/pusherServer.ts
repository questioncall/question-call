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
  getChannelPusherName,
} from "@/lib/pusher/events";

type PusherPayload = Record<string, unknown>;

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
