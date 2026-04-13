"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store/store";
import { initUploadManager } from "@/lib/upload-manager";
import { GlobalUploadProgress } from "@/components/shared/global-upload-progress";

type StoreProviderProps = {
  children: ReactNode;
};

export function StoreProvider({ children }: StoreProviderProps) {
  const [store] = useState<AppStore>(() => {
    const s = makeStore();
    initUploadManager(s);
    return s;
  });

  return (
    <Provider store={store}>
      {children}
      <GlobalUploadProgress />
    </Provider>
  );
}