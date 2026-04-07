import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { FeedQuestion } from "@/lib/question-types";

type FeedConnectionStatus = "idle" | "connecting" | "connected" | "failed";

type FeedState = {
  items: FeedQuestion[];
  isHydrated: boolean;
  connectionStatus: FeedConnectionStatus;
  lastEventAt: string | null;
};

const initialState: FeedState = {
  items: [],
  isHydrated: false,
  connectionStatus: "idle",
  lastEventAt: null,
};

function compareByFeedOrder(a: FeedQuestion, b: FeedQuestion) {
  if (a.resetCount !== b.resetCount) {
    return b.resetCount - a.resetCount;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function sortAndDedupe(items: FeedQuestion[]) {
  const uniqueItems = new Map<string, FeedQuestion>();

  for (const item of items) {
    uniqueItems.set(item.id, item);
  }

  return Array.from(uniqueItems.values()).sort(compareByFeedOrder);
}

function prependUnique(items: FeedQuestion[], question: FeedQuestion) {
  return [question, ...items.filter((item) => item.id !== question.id)];
}

const feedSlice = createSlice({
  name: "feed",
  initialState,
  reducers: {
    hydrateFeed(state, action: PayloadAction<FeedQuestion[]>) {
      if (state.isHydrated && state.items.length > 0) {
        return;
      }

      state.items = sortAndDedupe(action.payload);
      state.isHydrated = true;
      state.lastEventAt = new Date().toISOString();
    },
    setFeedQuestions(state, action: PayloadAction<FeedQuestion[]>) {
      state.items = sortAndDedupe(action.payload);
      state.isHydrated = true;
      state.lastEventAt = new Date().toISOString();
    },
    prependFeedQuestion(state, action: PayloadAction<FeedQuestion>) {
      state.items = prependUnique(state.items, action.payload);
      state.isHydrated = true;
      state.lastEventAt = new Date().toISOString();
    },
    upsertFeedQuestion(state, action: PayloadAction<FeedQuestion>) {
      state.items = sortAndDedupe(prependUnique(state.items, action.payload));
      state.isHydrated = true;
      state.lastEventAt = new Date().toISOString();
    },
    removeFeedQuestion(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.lastEventAt = new Date().toISOString();
    },
    setFeedConnectionStatus(state, action: PayloadAction<FeedConnectionStatus>) {
      state.connectionStatus = action.payload;
    },
    clearFeed(state) {
      state.items = [];
      state.isHydrated = false;
      state.connectionStatus = "idle";
      state.lastEventAt = null;
    },
  },
});

export const {
  hydrateFeed,
  setFeedQuestions,
  prependFeedQuestion,
  upsertFeedQuestion,
  removeFeedQuestion,
  setFeedConnectionStatus,
  clearFeed,
} = feedSlice.actions;

export default feedSlice.reducer;
