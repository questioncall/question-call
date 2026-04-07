import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/features/auth/auth-slice";
import feedReducer from "@/store/features/feed/feed-slice";
import userReducer from "@/store/features/user/user-slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      feed: feedReducer,
      user: userReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
