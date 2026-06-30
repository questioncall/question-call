"use client";

export const PERSISTENT_CALL_START_EVENT = "qc:persistent-call:start";

export type PersistentCallStartDetail = {
  callSessionId: string;
};

export function startPersistentCall(detail: PersistentCallStartDetail) {
  window.dispatchEvent(
    new CustomEvent<PersistentCallStartDetail>(PERSISTENT_CALL_START_EVENT, {
      detail,
    }),
  );
}
