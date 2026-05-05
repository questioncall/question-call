import {
  getFirebaseMessaging,
  isFirebaseConfigured,
} from "@/lib/firebase-admin";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";
import webpush from "web-push";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || process.env.VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "";
  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
}

export type PushNotificationEvent =
  | "withdrawal:processed"
  | "subscription:activated"
  | "monthly:bonus"
  | "daily:target"
  | "call:incoming"
  | "question:new"
  | "question:accepted"
  | "admin:broadcast";

export type PushNotificationPayload = {
  userId: string;
  event: PushNotificationEvent;
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: string;
  icon?: string;
};

/**
 * Send push notification to user(s) based on platform
 * Handles web push for web/iOS and FCM for Android
 */
export async function sendPushNotification(
  payload: PushNotificationPayload,
): Promise<{
  success: number;
  failed: number;
  errors: { platform: string; error: string }[];
}> {
  await connectToDatabase();

  const subscriptions = await PushSubscriptionModel.find({
    userId: payload.userId,
  });

  if (subscriptions.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ platform: string; error: string }>,
  };

  // Group subscriptions by platform
  const byPlatform = subscriptions.reduce(
    (acc, sub) => {
      const platform = sub.platform || "web";
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(sub);
      return acc;
    },
    {} as Record<string, typeof subscriptions>,
  );

  // Send web push for web/iOS
  if (byPlatform["web"] || byPlatform["ios"]) {
    await sendWebPush(byPlatform["web"] || [], payload, results);
    await sendWebPush(byPlatform["ios"] || [], payload, results);
  }

  // Send FCM for Android
  if (byPlatform["android"]) {
    await sendFCM(byPlatform["android"], payload, results);
  }

  return results;
}

/**
 * Send web push notifications (Web Push API)
 */
async function sendWebPush(
  subscriptions: any[],
  payload: PushNotificationPayload,
  results: any,
): Promise<void> {
  if (subscriptions.length === 0) return;
  ensureVapidConfigured();

  const notificationOptions = {
    title: payload.title,
    body: payload.body,
    badge: payload.badge || "https://questioncall.com/logo.png",
    icon: payload.icon || "https://questioncall.com/icon.png",
    tag: payload.event, // Group notifications by event type
    data: payload.data || {},
  };

  for (const sub of subscriptions) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      await webpush.sendNotification(
        subscription,
        JSON.stringify(notificationOptions),
      );
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        platform: "web",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // If subscription is expired, delete it
      if (error instanceof Error && error.message.includes("410")) {
        await PushSubscriptionModel.deleteOne({ _id: sub._id });
      }
    }
  }
}

/**
 * Send FCM (Firebase Cloud Messaging) push notifications for Android
 */
async function sendFCM(
  subscriptions: any[],
  payload: PushNotificationPayload,
  results: any,
): Promise<void> {
  if (subscriptions.length === 0) return;

  if (!isFirebaseConfigured()) {
    results.failed += subscriptions.length;
    results.errors.push({
      platform: "android",
      error: "Firebase not configured",
    });
    return;
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    results.failed += subscriptions.length;
    results.errors.push({
      platform: "android",
      error: "Failed to initialize Firebase",
    });
    return;
  }

  // Determine notification priority based on event type
  const isHighPriority = payload.event === "call:incoming";

  for (const sub of subscriptions) {
    try {
      // Extract device token from endpoint (for FCM, the endpoint is the device token)
      const deviceToken = sub.endpoint;

      await messaging.send({
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: isHighPriority ? "high" : "normal",
          notification: {
            channelId: getChannelIdForEvent(payload.event),
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        platform: "android",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // If token is invalid, delete the subscription
      if (
        error instanceof Error &&
        (error.message.includes("registration token is invalid") ||
          error.message.includes("Mismatched credential"))
      ) {
        await PushSubscriptionModel.deleteOne({ _id: sub._id });
      }
    }
  }
}

/**
 * Map event types to FCM channel IDs
 */
function getChannelIdForEvent(event: PushNotificationEvent): string {
  const channels: Record<PushNotificationEvent, string> = {
    "withdrawal:processed": "wallet",
    "subscription:activated": "subscription",
    "monthly:bonus": "rewards",
    "daily:target": "rewards",
    "call:incoming": "calls",
    "question:new": "questions",
    "question:accepted": "questions",
    "admin:broadcast": "admin",
  };

  return channels[event] || "general";
}

/**
 * Send bulk notifications to multiple users
 */
export async function sendBulkPushNotifications(
  payload: Omit<PushNotificationPayload, "userId"> & { userIds: string[] },
): Promise<{
  totalSuccess: number;
  totalFailed: number;
  errors: { userId: string; platform: string; error: string }[];
}> {
  const results = {
    totalSuccess: 0,
    totalFailed: 0,
    errors: [] as Array<{ userId: string; platform: string; error: string }>,
  };

  for (const userId of payload.userIds) {
    const result = await sendPushNotification({
      ...payload,
      userId,
    });

    results.totalSuccess += result.success;
    results.totalFailed += result.failed;
    result.errors.forEach((err) => {
      results.errors.push({
        userId,
        platform: err.platform,
        error: err.error,
      });
    });
  }

  return results;
}
