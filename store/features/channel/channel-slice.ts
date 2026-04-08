import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { ChannelDetail, ChatMessage, ChannelStatus } from "@/types/channel";

type ActiveChannelState = {
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

const initialState: ActiveChannelState = {
  channel: null,
  messages: [],
  isLoaded: false,
  isLoading: false,
  error: null,
  isAnswerSubmitted: false,
};

const channelSlice = createSlice({
  name: "channel",
  initialState,
  reducers: {
    setChannelLoading(state) {
      state.isLoading = true;
      state.error = null;
    },

    setChannelData(
      state,
      action: PayloadAction<{ channel: ChannelDetail; messages: ChatMessage[] }>,
    ) {
      state.channel = action.payload.channel;
      state.messages = action.payload.messages;
      state.isAnswerSubmitted = action.payload.channel.isAnswerSubmitted || false;
      state.isLoaded = true;
      state.isLoading = false;
      state.error = null;
    },

    setChannelError(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    /** Add a new message (from send or Pusher) — dedupes by ID */
    addMessage(state, action: PayloadAction<ChatMessage>) {
      const exists = state.messages.some((m) => m.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },

    /** Update a message (e.g. mark as sent after upload completes) */
    updateMessage(
      state,
      action: PayloadAction<{ id: string; updates: Partial<ChatMessage> }>,
    ) {
      const index = state.messages.findIndex((m) => m.id === action.payload.id);
      if (index >= 0) {
        state.messages[index] = { ...state.messages[index], ...action.payload.updates };
      }
    },

    /** Remove a message (e.g. on failed send) */
    removeMessage(state, action: PayloadAction<string>) {
      state.messages = state.messages.filter((m) => m.id !== action.payload);
    },

    toggleMessageMarked(state, action: PayloadAction<{ messageId: string; isMarkedAsAnswer: boolean }>) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) {
        msg.isMarkedAsAnswer = action.payload.isMarkedAsAnswer;
      }
    },

    /** Update channel status (from Pusher status event) */
    setChannelStatus(state, action: PayloadAction<ChannelStatus>) {
      if (state.channel) {
        state.channel.status = action.payload;
      }
    },

    /** Update the rating on the channel */
    setChannelRating(state, action: PayloadAction<number>) {
      if (state.channel) {
        state.channel.ratingGiven = action.payload;
      }
    },

    /** Mark answer as submitted */
    setAnswerSubmitted(state, action: PayloadAction<boolean>) {
      state.isAnswerSubmitted = action.payload;
    },

    /** Mark all counterpart messages as seen (we read them) */
    markMessagesAsSeen(state) {
      state.messages = state.messages.map((m) => {
        if (!m.isOwn && !m.isSeen) {
          return { ...m, isSeen: true };
        }
        return m;
      });
    },

    /** Mark all our own messages as seen (they read them) */
    markOwnMessagesAsSeen(state) {
      state.messages = state.messages.map((m) => {
        if (m.isOwn && !m.isSeen) {
          return { ...m, isSeen: true };
        }
        return m;
      });
    },

    /** Reset the active channel state (when navigating away) */
    clearActiveChannel() {
      return initialState;
    },
  },
});

export const {
  setChannelLoading,
  setChannelData,
  setChannelError,
  addMessage,
  updateMessage,
  removeMessage,
  toggleMessageMarked,
  setChannelStatus,
  setChannelRating,
  setAnswerSubmitted,
  markMessagesAsSeen,
  markOwnMessagesAsSeen,
  clearActiveChannel,
} = channelSlice.actions;

export default channelSlice.reducer;
