import { RoomServiceClient } from "livekit-server-sdk";

import Channel from "@/models/Channel";

export function getChannelRoomName(channelId: string): string {
  return `channel_${channelId}`;
}

function getRoomServiceClient(): RoomServiceClient | null {
  const wsUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!wsUrl || !apiKey || !apiSecret) return null;
  // RoomServiceClient speaks HTTPS to the SFU's REST API, while LIVEKIT_URL
  // is the wss endpoint clients use. Same host, different scheme.
  const httpUrl = wsUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

// Fire-and-forget: pre-allocate the LiveKit room on the SFU and persist the
// roomName on the Channel doc. Safe to call multiple times — LiveKit returns
// the existing room if it's already created. Never throws; callers should
// invoke with `void`.
export async function prepareChannelRoom(channelId: string): Promise<void> {
  const roomName = getChannelRoomName(channelId);

  const persist = Channel.updateOne(
    { _id: channelId, roomName: null },
    { $set: { roomName } },
  ).catch((err) => {
    console.warn("[livekit] persist roomName failed:", err);
  });

  const client = getRoomServiceClient();
  const provision = client
    ? client
        .createRoom({
          name: roomName,
          emptyTimeout: 5 * 60,
          maxParticipants: 2,
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          if (!/already exists/i.test(message)) {
            console.warn("[livekit] createRoom failed:", message);
          }
        })
    : Promise.resolve();

  await Promise.allSettled([persist, provision]);
}
