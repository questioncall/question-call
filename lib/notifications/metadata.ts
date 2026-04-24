type NotificationLike = {
  type?: string | null;
  href?: string | null;
};

export function getNotificationTitle(type?: string | null) {
  switch (type) {
    case "QUESTION_ACCEPTED":
      return "Question accepted";
    case "ANSWER_SUBMITTED":
      return "Answer ready";
    case "QUESTION_RESET":
      return "Question reopened";
    case "CHANNEL_CLOSED":
      return "Channel update";
    case "CHANNEL_EXPIRED":
      return "Channel expired";
    case "DEADLINE_WARNING":
      return "Answer deadline";
    case "RATING_RECEIVED":
      return "New rating";
    case "PAYMENT":
      return "Payment update";
    case "SYSTEM":
      return "System update";
    default:
      return "Question Call";
  }
}

export function getDefaultNotificationHref(type?: string | null) {
  switch (type) {
    case "PAYMENT":
      return "/subscription";
    case "RATING_RECEIVED":
      return "/wallet";
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
