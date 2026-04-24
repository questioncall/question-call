import "server-only";

import webpush from "web-push";

import { getNotificationTitle, resolveNotificationHref } from "@/lib/notifications/metadata";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";

type NotificationPayload = {
  type: string;
  message: string;
  href?: string | null;
};

type PushPayload = {
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

  return {
    publicKey,
    privateKey,
    subject,
  };
}

function ensureWebPushConfigured() {
  if (vapidConfigured) {
    return true;
  }

  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!publicKey || !privateKey || !subject) {
    return false;
  }

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

function buildPushPayload(notification: NotificationPayload): PushPayload {
  return {
    title: getNotificationTitle(notification.type),
    body: notification.message,
    url: resolveNotificationHref(notification),
    tag: `notification-${notification.type.toLowerCase()}`,
    icon: "/icon.png",
    badge: "/icon.png",
  };
}

export async function sendPushNotificationToUser(
  userId: string,
  notification: NotificationPayload,
) {
  if (!ensureWebPushConfigured()) {
    return;
  }

  await connectToDatabase();

  const subscriptions = await PushSubscriptionModel.find({ userId })
    .select("_id endpoint expirationTime keys")
    .lean();

  if (subscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify(buildPushPayload(notification));

  const endpointSuffix = (endpoint: string) =>
    endpoint.length > 30 ? `…${endpoint.slice(-30)}` : endpoint;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
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
          payload,
          {
            TTL: 300,
          },
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;

        console.warn(
          `[web-push] Send failed for user=${userId} endpoint=${endpointSuffix(subscription.endpoint)} status=${statusCode ?? "unknown"}`,
        );

        // Only delete on 410 (Gone) — the endpoint is permanently invalid.
        // 404 can be transient on Android (endpoint churn during subscription refresh).
        if (statusCode === 410) {
          console.warn(
            `[web-push] Deleting gone subscription id=${String(subscription._id)} endpoint=${endpointSuffix(subscription.endpoint)}`,
          );
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
