import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { ChannelListItem } from "@/types/channel";

type ChannelsListState = {
  /** All channels for the current user (sidebar list) */
  items: ChannelListItem[];
  /** Whether data has been loaded from API */
  isHydrated: boolean;
  /** Loading state */
  isLoading: boolean;
};

const initialState: ChannelsListState = {
  items: [],
  isHydrated: false,
  isLoading: false,
};

const channelsSlice = createSlice({
  name: "channels",
  initialState,
  reducers: {
    setChannelsLoading(state) {
      state.isLoading = true;
    },

    setChannelsList(state, action: PayloadAction<ChannelListItem[]>) {
      state.items = action.payload;
      state.isHydrated = true;
      state.isLoading = false;
    },

    /** Upsert a single channel in the list (e.g. after new channel created or status change) */
    upsertChannelItem(state, action: PayloadAction<ChannelListItem>) {
      const index = state.items.findIndex((c) => c.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      } else {
        state.items.unshift(action.payload);
      }
    },

    /** Update the last message preview for a channel */
    updateChannelPreview(
      state,
      action: PayloadAction<{ channelId: string; preview: string; at: string }>,
    ) {
      const channel = state.items.find((c) => c.id === action.payload.channelId);
      if (channel) {
        channel.lastMessagePreview = action.payload.preview;
        channel.lastMessageAt = action.payload.at;
      }
    },

    clearChannelsList() {
      return initialState;
    },

    /** Increment unread count for a specific channel */
    incrementChannelUnread(state, action: PayloadAction<{ channelId: string; incrementBy: number }>) {
      const channel = state.items.find((c) => c.id === action.payload.channelId);
      if (channel) {
        channel.unreadCount = (channel.unreadCount || 0) + action.payload.incrementBy;
        // Bump to top
        state.items = [channel, ...state.items.filter((c) => c.id !== action.payload.channelId)];
      }
    },

    /** Clear unread count when a channel is opened/read */
    clearChannelUnread(state, action: PayloadAction<string>) {
      const channel = state.items.find((c) => c.id === action.payload);
      if (channel) {
        channel.unreadCount = 0;
      }
    },
  },
});

export const {
  setChannelsLoading,
  setChannelsList,
  upsertChannelItem,
  updateChannelPreview,
  incrementChannelUnread,
  clearChannelUnread,
  clearChannelsList,
} = channelsSlice.actions;

export default channelsSlice.reducer;
