import {
  getCallRingtoneOption,
  type CallRingtone,
} from "@/lib/call-settings";

type CallTonePlaybackOptions = {
  loop?: boolean;
  volume?: number;
  onEnded?: () => void;
};

/**
 * Play a call ringtone using the browser's native Audio API.
 * Audio files are served from /sounds/<key>.wav (Next.js public dir).
 *
 * Returns a stop function, or null if playback can't start (SSR, etc.).
 */
export function playCallTone(
  ringtone: CallRingtone,
  { loop = false, volume = 0.5, onEnded }: CallTonePlaybackOptions = {},
): (() => void) | null {
  if (typeof window === "undefined") {
    return null;
  }

  const tone = getCallRingtoneOption(ringtone);
  const audio = new Audio(tone.file);
  audio.loop = loop;
  audio.volume = Math.max(Math.min(volume, 1), 0.05);

  let isStopped = false;

  const handleEnded = () => {
    if (!loop && !isStopped) {
      onEnded?.();
    }
  };

  audio.addEventListener("ended", handleEnded);

  // Start playback — catch autoplay-policy rejections gracefully
  audio.play().catch(() => {
    if (!isStopped) {
      onEnded?.();
    }
  });

  return () => {
    if (isStopped) return;
    isStopped = true;
    audio.removeEventListener("ended", handleEnded);
    audio.pause();
    audio.currentTime = 0;
    // Release the resource
    audio.src = "";
  };
}
