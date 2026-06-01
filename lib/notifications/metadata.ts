type NotificationLike = {
  type?: string | null;
  href?: string | null;
};

export type NotificationTheme = {
  /** Title shown in the push notification */
  title: string;
  /** Android notification channel ID (must match channels registered in the app) */
  channelId: "chat" | "questions" | "calls" | "wallet" | "default";
  /** FCM / Expo delivery priority */
  priority: "high" | "normal" | "default";
  /** Play sound */
  sound: "default" | null;
};

/**
 * Maps a notification type (and optional href) to a distinct push-notification
 * theme: title, Android channel, priority, and sound.
 *
 * The href is used to disambiguate coarse types like PAYMENT and SYSTEM that
 * cover several real-world events (withdrawal vs subscription, message vs call).
 */
export function getNotificationTheme(
  type?: string | null,
  href?: string | null,
): NotificationTheme {
  switch (type) {
    // ── Chat ─────────────────────────────────────────────────────────────────
    case "CHAT_MESSAGE":
      return { title: "New Message", channelId: "chat", priority: "high", sound: "default" };

    // ── Questions ────────────────────────────────────────────────────────────
    case "QUESTION_ACCEPTED":
      return { title: "Question Accepted", channelId: "questions", priority: "high", sound: "default" };

    case "QUESTION_RESET":
      return { title: "Question Reopened", channelId: "questions", priority: "normal", sound: "default" };

    case "ANSWER_SUBMITTED":
      return { title: "Answer Ready", channelId: "questions", priority: "high", sound: "default" };

    case "DEADLINE_WARNING":
      return { title: "Answer Deadline Warning", channelId: "questions", priority: "high", sound: "default" };

    // ── Channel lifecycle ────────────────────────────────────────────────────
    case "CHANNEL_CLOSED":
      return { title: "Channel Closed", channelId: "chat", priority: "normal", sound: null };

    case "CHANNEL_EXPIRED":
      return { title: "Channel Expired", channelId: "chat", priority: "normal", sound: null };

    // ── Ratings ──────────────────────────────────────────────────────────────
    case "RATING_RECEIVED":
      return { title: "New Rating Received", channelId: "wallet", priority: "normal", sound: "default" };

    // ── Wallet & payments (use href to distinguish sub-events) ───────────────
    case "PAYMENT": {
      if (href?.startsWith("/wallet")) {
        // Withdrawal submitted or approved
        return { title: "Wallet Update", channelId: "wallet", priority: "high", sound: "default" };
      }
      if (href?.startsWith("/subscription")) {
        return { title: "Plan Activated", channelId: "wallet", priority: "high", sound: "default" };
      }
      // Course purchase or generic payment
      return { title: "Payment Approved", channelId: "wallet", priority: "high", sound: "default" };
    }

    case "DAILY_TARGET_BONUS":
      return { title: "Daily Target Reached", channelId: "wallet", priority: "normal", sound: "default" };

    // ── Course studio ────────────────────────────────────────────────────────
    case "COURSE_VIDEO_READY":
      return { title: "Video Ready 🎬", channelId: "default", priority: "high", sound: "default" };

    // ── System / Calls (use href to distinguish) ─────────────────────────────
    case "SYSTEM": {
      if (href?.startsWith("/calls/") || href?.startsWith("/call/")) {
        return { title: "Incoming Call", channelId: "calls", priority: "high", sound: "default" };
      }
      return { title: "System Update", channelId: "default", priority: "normal", sound: null };
    }

    default:
      return { title: "QuestionCall", channelId: "default", priority: "normal", sound: null };
  }
}

export function getNotificationTitle(type?: string | null) {
  return getNotificationTheme(type).title;
}

export function getDefaultNotificationHref(type?: string | null) {
  switch (type) {
    case "PAYMENT":
      return "/subscription";
    case "RATING_RECEIVED":
      return "/wallet";
    case "DAILY_TARGET_BONUS":
      return "/wallet";
    case "COURSE_VIDEO_READY":
      return "/studio";
    case "SYSTEM":
      return "/settings";
    default:
      return "/";
  }
}

export function resolveNotificationHref(notification: NotificationLike) {
  if (typeof notification.href === "string" && notification.href.trim().length > 0) {
    return notification.href.trim();
  }

  return getDefaultNotificationHref(notification.type);
}
