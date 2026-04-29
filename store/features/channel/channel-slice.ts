import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { ChannelDetail, ChatMessage, ChannelStatus } from "@/types/channel";

export type ChatSessionState = {
  /** The channel currently being viewed */
  channel: ChannelDetail | null;
  /** All messages in the active channel */
  messages: ChatMessage[];
  /** Whether data has been loaded from API */
  isLoaded: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message if load failed */
  error: string | null;
  /** Whether the teacher has officially submitted the answer */
  isAnswerSubmitted: boolean;
};

type ChannelSliceState = {
  /** ID of the channel currently being viewed */
  activeChannelId: string | null;
  /** Cache of all visited channel sessions, keyed by channelId */
  sessions: Record<string, ChatSessionState>;
};

const initialSessionState: ChatSessionState = {
  channel: null,
  messages: [],
  isLoaded: false,
  isLoading: false,
  error: null,
  isAnswerSubmitted: false,
};

const initialState: ChannelSliceState = {
  activeChannelId: null,
  sessions: {},
};

function getOrCreateSession(
  sessions: Record<string, ChatSessionState>,
  channelId: string,
): ChatSessionState {
  return sessions[channelId] ?? { ...initialSessionState };
}

const channelSlice = createSlice({
  name: "channel",
  initialState,
  reducers: {
    /** Set the active channel being viewed */
    setActiveChannelId(state, action: PayloadAction<string | null>) {
      state.activeChannelId = action.payload;
    },

    setChannelLoading(state, action: PayloadAction<string>) {
      const channelId = action.payload;
      const session = getOrCreateSession(state.sessions, channelId);
      session.isLoading = true;
      session.error = null;
      state.sessions[channelId] = session;
    },

    setChannelData(
      state,
      action: PayloadAction<{ channelId: string; channel: ChannelDetail; messages: ChatMessage[] }>,
    ) {
      const { channelId, channel, messages } = action.payload;
      state.sessions[channelId] = {
        channel,
        messages,
        isAnswerSubmitted: channel.isAnswerSubmitted || false,
        isLoaded: true,
        isLoading: false,
        error: null,
      };
    },

    setChannelError(state, action: PayloadAction<{ channelId: string; error: string }>) {
      const { channelId, error } = action.payload;
      const session = getOrCreateSession(state.sessions, channelId);
      session.isLoading = false;
      session.error = error;
      state.sessions[channelId] = session;
    },

    /** Add a new message (from send or Pusher) — dedupes by ID */
    addMessage(state, action: PayloadAction<{ channelId: string; message: ChatMessage }>) {
      const { channelId, message } = action.payload;
      const session = getOrCreateSession(state.sessions, channelId);
      const exists = session.messages.some((m) => m.id === message.id);
      if (!exists) {
        session.messages.push(message);
      }
      state.sessions[channelId] = session;
    },

    /** Update a message (e.g. mark as sent after upload completes) */
    updateMessage(
      state,
      action: PayloadAction<{ channelId: string; id: string; updates: Partial<ChatMessage> }>,
    ) {
      const { channelId, id, updates } = action.payload;
      const session = state.sessions[channelId];
      if (!session) return;
      const index = session.messages.findIndex((m) => m.id === id);
      if (index >= 0) {
        session.messages[index] = { ...session.messages[index], ...updates };
      }
    },

    /** Remove a message (e.g. on failed send) */
    removeMessage(state, action: PayloadAction<{ channelId: string; messageId: string }>) {
      const { channelId, messageId } = action.payload;
      const session = state.sessions[channelId];
      if (!session) return;
      session.messages = session.messages.filter((m) => m.id !== messageId);
    },

    toggleMessageMarked(
      state,
      action: PayloadAction<{ channelId: string; messageId: string; isMarkedAsAnswer: boolean }>,
    ) {
      const { channelId, messageId, isMarkedAsAnswer } = action.payload;
      const session = state.sessions[channelId];
      if (!session) return;
      const msg = session.messages.find((m) => m.id === messageId);
      if (msg) {
        msg.isMarkedAsAnswer = isMarkedAsAnswer;
      }
    },

    /** Update channel status (from Pusher status event) */
    setChannelStatus(
      state,
      action: PayloadAction<{ channelId: string; status: ChannelStatus }>,
    ) {
      const { channelId, status } = action.payload;
      const session = state.sessions[channelId];
      if (session?.channel) {
        session.channel.status = status;
      }
    },

    /** Update the rating on the channel */
    setChannelRating(state, action: PayloadAction<{ channelId: string; rating: number }>) {
      const { channelId, rating } = action.payload;
      const session = state.sessions[channelId];
      if (session?.channel) {
        session.channel.ratingGiven = rating;
      }
    },

    /** Sync timer updates such as time extensions */
    setChannelTimer(
      state,
      action: PayloadAction<{
        channelId: string;
        timerDeadline: string;
        timeExtensionCount: number;
      }>,
    ) {
      const { channelId, timerDeadline, timeExtensionCount } = action.payload;
      const session = state.sessions[channelId];
      if (session?.channel) {
        session.channel.timerDeadline = timerDeadline;
        session.channel.timeExtensionCount = timeExtensionCount;
      }
    },

    /** Mark answer as submitted */
    setAnswerSubmitted(state, action: PayloadAction<{ channelId: string; value: boolean }>) {
      const { channelId, value } = action.payload;
      const session = state.sessions[channelId];
      if (session) {
        session.isAnswerSubmitted = value;
      }
    },

    /** Mark all counterpart messages as seen (we read them) */
    markMessagesAsSeen(state, action: PayloadAction<string>) {
      const session = state.sessions[action.payload];
      if (!session) return;
      session.messages = session.messages.map((m) => {
        if (!m.isOwn && !m.isSeen) {
          return { ...m, isSeen: true };
        }
        return m;
      });
    },

    /** Mark all our own messages as seen (they read them) */
    markOwnMessagesAsSeen(state, action: PayloadAction<string>) {
      const session = state.sessions[action.payload];
      if (!session) return;
      session.messages = session.messages.map((m) => {
        if (m.isOwn && !m.isSeen) {
          return { ...m, isSeen: true };
        }
        return m;
      });
    },

    /** Mark a message as deleted (from Pusher or local action) */
    setMessageDeleted(
      state,
      action: PayloadAction<{ channelId: string; messageId: string }>,
    ) {
      const { channelId, messageId } = action.payload;
      const session = state.sessions[channelId];
      if (!session) return;
      const msg = session.messages.find((m) => m.id === messageId);
      if (msg) {
        msg.isDeleted = true;
        msg.content = "";
        msg.mediaUrl = null;
        msg.mediaType = null;
        msg.isMarkedAsAnswer = false;
      }
    },

    /**
     * Evict a single channel session from the cache.
     * Only call this when you explicitly want to force a fresh load
     * (e.g., the channel was archived/deleted).
     */
    evictChannelSession(state, action: PayloadAction<string>) {
      delete state.sessions[action.payload];
      if (state.activeChannelId === action.payload) {
        state.activeChannelId = null;
      }
    },

    /** Clear everything — used on sign-out */
    clearAllChannelSessions() {
      return initialState;
    },
  },
});

export const {
  setActiveChannelId,
  setChannelLoading,
  setChannelData,
  setChannelError,
  addMessage,
  updateMessage,
  removeMessage,
  toggleMessageMarked,
  setMessageDeleted,
  setChannelStatus,
  setChannelRating,
  setChannelTimer,
  setAnswerSubmitted,
  markMessagesAsSeen,
  markOwnMessagesAsSeen,
  evictChannelSession,
  clearAllChannelSessions,
} = channelSlice.actions;

export default channelSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
/** Get the session for a specific channelId (or undefined if not cached) */
export function selectChannelSession(
  sessions: Record<string, ChatSessionState>,
  channelId: string,
): ChatSessionState | undefined {
  return sessions[channelId];
}
