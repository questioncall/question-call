import "server-only";

import webpush from "web-push";

import { sendExpoPush } from "@/lib/push/expo-push";
import { getNotificationTheme, resolveNotificationHref } from "@/lib/notifications/metadata";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";

type NotificationPayload = {
  type: string;
  message: string;
  href?: string | null;
};

type WebPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  icon: string;
  badge: string;
};

let vapidConfigured = false;

function getVapidConfig() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "";
  return { publicKey, privateKey, subject };
}

function ensureWebPushConfigured() {
  if (vapidConfigured) return true;
  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isWebPushConfigured() {
  const { publicKey, privateKey, subject } = getVapidConfig();
  return Boolean(publicKey && privateKey && subject);
}

export function getWebPushPublicKey() {
  return getVapidConfig().publicKey;
}

function buildWebPushPayload(notification: NotificationPayload): WebPushPayload {
  const theme = getNotificationTheme(notification.type, notification.href);
  const url = resolveNotificationHref(notification);
  return {
    title: theme.title,
    body: notification.message,
    url,
    tag: `notification-${notification.type.toLowerCase()}`,
    icon: "/icon.png",
    badge: "/icon.png",
  };
}

function isGoneSubscriptionError(error: unknown) {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : undefined;
  return statusCode === 410;
}

/**
 * Send a push notification to all of a user's registered devices.
 *
 * - Android (Expo Push Token) → delivered via Expo's push service (no Firebase key needed).
 * - Web / iOS → delivered via Web Push API (VAPID).
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: NotificationPayload,
) {
  await connectToDatabase();

  const subscriptions = await PushSubscriptionModel.find({ userId })
    .select("_id endpoint expirationTime keys platform")
    .lean();

  if (subscriptions.length === 0) return;

  const theme = getNotificationTheme(notification.type, notification.href);
  const url = resolveNotificationHref(notification);

  // ── Android → Expo push ──────────────────────────────────────────────────
  const androidSubs = subscriptions.filter((s) => (s.platform ?? "web") === "android");
  if (androidSubs.length > 0) {
    await sendExpoPush(androidSubs, {
      title: theme.title,
      body: notification.message,
      data: {
        type: notification.type,
        url,
        href: url,
      },
      channelId: theme.channelId,
      priority: theme.priority,
      sound: theme.sound,
    }).catch((err) => {
      console.error("[web-push] Expo push failed for user:", userId, err);
    });
  }

  // ── Web / iOS → Web Push API (VAPID) ────────────────────────────────────
  const webSubs = subscriptions.filter((s) => {
    const platform = s.platform ?? "web";
    return platform === "web" || platform === "ios";
  });

  if (webSubs.length === 0) return;

  const webPushConfigured = ensureWebPushConfigured();
  if (!webPushConfigured) {
    console.warn(`[web-push] VAPID is not configured; skipping web/iOS push for user=${userId}`);
    return;
  }

  const payload = buildWebPushPayload(notification);
  const endpointTail = (ep: string) => (ep.length > 30 ? `…${ep.slice(-30)}` : ep);

  await Promise.allSettled(
    webSubs.map(async (subscription) => {
      if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
        console.warn(`[web-push] Subscription id=${String(subscription._id)} missing keys; skipping`);
        return;
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? undefined,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          JSON.stringify(payload),
          { TTL: 300 },
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;

        console.warn(
          `[web-push] Send failed for user=${userId} endpoint=${endpointTail(subscription.endpoint)} status=${statusCode ?? "unknown"}`,
        );

        if (isGoneSubscriptionError(error)) {
          await PushSubscriptionModel.findByIdAndDelete(subscription._id).catch(() => null);
          return;
        }

        if (statusCode !== 404) {
          console.error("[web-push] Unexpected push send error", error);
        }
      }
    }),
  );
}
