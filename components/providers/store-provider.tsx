"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store/store";
import { initUploadManager } from "@/lib/upload-manager";
import { initChatUploadManager } from "@/lib/chat-upload-manager";
import { addMessage, updateMessage, removeMessage } from "@/store/features/channel/channel-slice";
import { GlobalUploadProgress } from "@/components/shared/global-upload-progress";
import { GlobalUploadToast } from "@/components/shared/global-upload-toast";

type StoreProviderProps = {
  children: ReactNode;
};

export function StoreProvider({ children }: StoreProviderProps) {
  const [store] = useState<AppStore>(() => {
    const s = makeStore();
    initUploadManager(s);
    initChatUploadManager(s.dispatch, { addMessage, updateMessage, removeMessage });
    return s;
  });

  return (
    <Provider store={store}>
      {children}
      <GlobalUploadProgress />
      <GlobalUploadToast />
    </Provider>
  );
}