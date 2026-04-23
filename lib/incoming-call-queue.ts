type IncomingCallLike = {
  callSessionId: string;
  channelId: string;
};

export function enqueueIncomingCall<T extends IncomingCallLike>(
  queue: T[],
  nextCall: T,
) {
  const alreadyQueued = queue.some(
    (item) =>
      item.callSessionId === nextCall.callSessionId ||
      item.channelId === nextCall.channelId,
  );

  if (alreadyQueued) {
    return queue;
  }

  return [...queue, nextCall];
}

export function removeIncomingCall<T extends IncomingCallLike>(
  queue: T[],
  callSessionId?: string,
) {
  if (!callSessionId) {
    return queue.slice(1);
  }

  return queue.filter((item) => item.callSessionId !== callSessionId);
}
