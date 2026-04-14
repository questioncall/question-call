// ──────────────────────────────────────────────────────────
// Question Feed events
// ──────────────────────────────────────────────────────────
export const QUESTION_FEED_CHANNEL = "questions-feed";
export const QUESTION_CREATED_EVENT = "question:created";
export const QUESTION_UPDATED_EVENT = "question:updated";

// ──────────────────────────────────────────────────────────
// Channel (messaging) events
// ──────────────────────────────────────────────────────────
export const CHANNEL_MESSAGE_EVENT = "channel:message";
export const CHANNEL_STATUS_EVENT = "channel:status";
export const CHANNEL_MESSAGES_SEEN_EVENT = "channel:messages_seen";
// Marking a message as part of the formal answer
export const MESSAGE_MARKED_EVENT = "message:marked";

// Fired when the teacher submits the final answer
export const ANSWER_SUBMITTED_EVENT = "answer:submitted";
export const CHANNEL_CLOSED_EVENT = "channel:closed";

/** Returns the Pusher channel name for a given channel ID */
export function getChannelPusherName(channelId: string) {
  return `channel-${channelId}`;
}

// ──────────────────────────────────────────────────────────
// User specific events (channel list updates, etc.)
// ──────────────────────────────────────────────────────────
export const USER_CHANNEL_PREFIX = "user-";
export const CHANNEL_UPDATED_EVENT = "channel:updated";
export const NEW_CHANNEL_EVENT = "channel:new";
export const NOTIFICATION_EVENT = "notification:new";
export const SUBSCRIPTION_UPDATED_EVENT = "subscription:updated";

export function getUserPusherName(userId: string) {
  return `${USER_CHANNEL_PREFIX}${userId}`;
}

// ──────────────────────────────────────────────────────────
// Admin specific events
// ──────────────────────────────────────────────────────────
export const ADMIN_UPDATES_CHANNEL = "admin-updates";
export const ADMIN_WITHDRAWAL_EVENT = "admin:withdrawal-requested";
export const CONFIG_UPDATED_EVENT = "admin:config-updated";

// ──────────────────────────────────────────────────────────
// Course events
// ──────────────────────────────────────────────────────────
export const COURSE_UPDATES_CHANNEL = "courses-updates";
export const COURSE_UPDATED_EVENT = "course:updated";
