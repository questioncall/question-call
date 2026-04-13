import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/features/auth/auth-slice";
import channelReducer from "@/store/features/channel/channel-slice";
import channelsReducer from "@/store/features/channels/channels-slice";
import feedReducer from "@/store/features/feed/feed-slice";
import uploadReducer from "@/store/features/upload/upload-slice";
import userReducer from "@/store/features/user/user-slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      channel: channelReducer,
      channels: channelsReducer,
      feed: feedReducer,
      upload: uploadReducer,
      user: userReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
