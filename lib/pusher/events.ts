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

/** Returns the Pusher channel name for a given channel ID */
export function getChannelPusherName(channelId: string) {
  return `channel-${channelId}`;
}

// ──────────────────────────────────────────────────────────
// User specific events (channel list updates, etc.)
// ──────────────────────────────────────────────────────────
export const USER_CHANNEL_PREFIX = "user-";
export const CHANNEL_UPDATED_EVENT = "channel:updated";

export function getUserPusherName(userId: string) {
  return `${USER_CHANNEL_PREFIX}${userId}`;
}
