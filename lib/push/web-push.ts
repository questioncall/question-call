import "server-only";

import webpush from "web-push";

import {
  getFirebaseMessaging,
  isFirebaseConfigured,
} from "@/lib/firebase-admin";
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

function isGoneSubscriptionError(error: unknown) {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : undefined;

  return statusCode === 410;
}

function isInvalidFcmTokenError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const message = error instanceof Error ? error.message : "";

  return (
    code === "messaging/invalid-registration-token" ||
    code === "messaging/registration-token-not-registered" ||
    message.includes("registration token is invalid") ||
    message.includes("Requested entity was not found")
  );
}

function shouldUseHighPriorityFcm(notification: NotificationPayload) {
  return (
    notification.href?.startsWith("/calls/") ||
    notification.message.toLowerCase().includes("calling you")
  );
}

export async function sendPushNotificationToUser(
  userId: string,
  notification: NotificationPayload,
) {
  await connectToDatabase();

  const subscriptions = await PushSubscriptionModel.find({ userId })
    .select("_id endpoint expirationTime keys platform")
    .lean();

  if (subscriptions.length === 0) {
    return;
  }

  const payload = buildPushPayload(notification);
  const webPushConfigured = ensureWebPushConfigured();
  const firebaseConfigured = isFirebaseConfigured();
  const firebaseMessaging = firebaseConfigured ? getFirebaseMessaging() : null;

  const endpointSuffix = (endpoint: string) =>
    endpoint.length > 30 ? `…${endpoint.slice(-30)}` : endpoint;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const platform = subscription.platform ?? "web";

      if (platform === "android") {
        if (!firebaseMessaging) {
          console.warn(
            `[fcm-push] Firebase is not configured; skipping Android push for user=${userId}`,
          );
          return;
        }

        try {
          await firebaseMessaging.send({
            token: subscription.endpoint,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: {
              type: notification.type,
              href: payload.url,
              url: payload.url,
            },
            android: {
              priority: shouldUseHighPriorityFcm(notification) ? "high" : "normal",
              notification: {
                channelId: shouldUseHighPriorityFcm(notification)
                  ? "calls"
                  : "general",
                clickAction: "FLUTTER_NOTIFICATION_CLICK",
              },
            },
          });
        } catch (error) {
          console.warn(
            `[fcm-push] Send failed for user=${userId} token=${endpointSuffix(subscription.endpoint)}`,
            error,
          );

          if (isInvalidFcmTokenError(error)) {
            await PushSubscriptionModel.findByIdAndDelete(subscription._id).catch(() => null);
          }
        }

        return;
      }

      if (!webPushConfigured) {
        console.warn(
          `[web-push] VAPID is not configured; skipping ${platform} push for user=${userId}`,
        );
        return;
      }

      if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
        console.warn(
          `[web-push] Subscription id=${String(subscription._id)} is missing keys; skipping`,
        );
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
        if (isGoneSubscriptionError(error)) {
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
