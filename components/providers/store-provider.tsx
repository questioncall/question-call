"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store/store";

type StoreProviderProps = {
  children: ReactNode;
};

export function StoreProvider({ children }: StoreProviderProps) {
  const [store] = useState<AppStore>(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
