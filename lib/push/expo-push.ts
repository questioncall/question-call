import "server-only";

import PushSubscriptionModel from "@/models/PushSubscription";

export type ExpoMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Android notification channel ID */
  channelId?: string;
  priority?: "high" | "normal" | "default";
  sound?: "default" | null;
};

type ExpoTicketOk = { status: "ok"; id: string };
type ExpoTicketError = {
  status: "error";
  message: string;
  details?: { error?: string };
};
type ExpoTicket = ExpoTicketOk | ExpoTicketError;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;

export function isExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendChunk(
  entries: Array<{ token: string; subId: string }>,
  message: ExpoMessage,
): Promise<void> {
  const payload = entries.map((e) => ({
    to: e.token,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    channelId: message.channelId ?? "default",
    priority: message.priority ?? "normal",
    sound: message.sound !== undefined ? message.sound : "default",
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.warn(`[expo-push] HTTP ${res.status} from Expo push service`);
    return;
  }

  const json = (await res.json()) as { data: ExpoTicket[] };
  const tickets: ExpoTicket[] = json.data ?? [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === "error") {
      const errorCode = ticket.details?.error;
      const tokenTail = entries[i].token.slice(-12);
      console.warn(`[expo-push] Ticket error ...${tokenTail}: ${ticket.message} (${errorCode})`);
      // DeviceNotRegistered = token is stale — prune it so we don't keep trying
      if (errorCode === "DeviceNotRegistered") {
        await PushSubscriptionModel.findByIdAndDelete(entries[i].subId).catch(() => null);
      }
    }
  }
}

/**
 * Send a push notification via Expo's push service to one or more Android subscriptions.
 * Only sends to valid ExponentPushToken entries; silently skips raw FCM tokens.
 */
export async function sendExpoPush(
  subscriptions: Array<{ _id: { toString(): string }; endpoint: string }>,
  message: ExpoMessage,
): Promise<void> {
  const valid = subscriptions
    .filter((s) => isExpoPushToken(s.endpoint))
    .map((s) => ({ token: s.endpoint, subId: s._id.toString() }));

  if (valid.length === 0) {
    const endpoints = subscriptions.map((s) => s.endpoint.slice(0, 30));
    console.warn("[expo-push] No valid Expo tokens among", endpoints);
    return;
  }

  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    await sendChunk(valid.slice(i, i + CHUNK_SIZE), message).catch((err) => {
      console.error("[expo-push] Chunk send failed:", err);
    });
  }
}
