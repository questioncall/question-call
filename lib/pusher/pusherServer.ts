import Pusher from "pusher";

import type { FeedQuestion } from "@/lib/question-types";
import {
  QUESTION_CREATED_EVENT,
  QUESTION_FEED_CHANNEL,
  QUESTION_UPDATED_EVENT,
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
