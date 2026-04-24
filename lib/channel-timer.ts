export const CHANNEL_EXTENSION_MINUTES = 5;
export const MAX_CHANNEL_TIME_EXTENSIONS = 3;
export const CHANNEL_WARNING_THRESHOLD_MS = 5 * 60 * 1000;

export function getChannelTimeRemainingMs(timerDeadline: Date | string) {
  return new Date(timerDeadline).getTime() - Date.now();
}

export function isChannelInExtensionWindow(timerDeadline: Date | string) {
  const remainingMs = getChannelTimeRemainingMs(timerDeadline);
  return remainingMs > 0 && remainingMs <= CHANNEL_WARNING_THRESHOLD_MS;
}
