import Pusher from "pusher";

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
