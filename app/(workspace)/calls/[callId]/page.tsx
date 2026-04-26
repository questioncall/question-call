"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2Icon, AlertTriangleIcon, PhoneOffIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  CHANNEL_EXTENSION_MINUTES,
  CHANNEL_WARNING_THRESHOLD_MS,
  MAX_CHANNEL_TIME_EXTENSIONS,
} from "@/lib/channel-timer";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import {
  CALL_ENDED_EVENT,
  CHANNEL_TIMER_UPDATED_EVENT,
  getChannelPusherName,
} from "@/lib/pusher/events";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

type CallJoinPayload = {
  token: string;
  serverUrl: string;
  channelId: string;
  timerDeadline: string;
  timeExtensionCount: number;
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "Time's up";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function CallSessionPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params?.callId as string;
  const userId = useAppSelector((state) => state.user.id);
  const endingRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const dismissedPromptKeyRef = useRef<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [timerDeadline, setTimerDeadline] = useState<string | null>(null);
  const [timeExtensionCount, setTimeExtensionCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isExtendingTime, setIsExtendingTime] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateToChannel = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (channelId) {
      router.replace(`/channel/${channelId}`);
      return;
    }

    router.back();
  }, [channelId, router]);

  useEffect(() => {
    if (!callId) return;

    let mounted = true;

    async function fetchJoinDetails() {
      try {
        const response = await fetch(`/api/calls/${callId}/token`);
        const data = (await response.json()) as Partial<CallJoinPayload> & {
          error?: string;
        };

        if (!mounted) return;

        if (!response.ok) {
          throw new Error(data.error || "Failed to join call.");
        }

        setToken(data.token || null);
        setServerUrl(data.serverUrl || null);
        setChannelId(data.channelId || null);
        setTimerDeadline(data.timerDeadline || null);
        setTimeExtensionCount(data.timeExtensionCount ?? 0);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Error joining call");
      }
    }

    fetchJoinDetails();

    return () => {
      mounted = false;
    };
  }, [callId]);

  useEffect(() => {
    if (!timerDeadline) return;

    const updateCountdown = () => {
      const remainingMs = new Date(timerDeadline).getTime() - Date.now();
      setCountdown(Math.max(0, remainingMs));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [timerDeadline]);

  useEffect(() => {
    if (!channelId) return;

    const client = getPusherClient();
    if (!client) return;

    const channel = client.subscribe(getChannelPusherName(channelId));

    const handleTimerUpdated = (payload: {
      timerDeadline?: string;
      timeExtensionCount?: number;
      extendedBy?: string;
      extendedByName?: string;
      extensionMinutes?: number;
    }) => {
      if (!payload.timerDeadline || typeof payload.timeExtensionCount !== "number") {
        return;
      }

      setTimerDeadline(payload.timerDeadline);
      setTimeExtensionCount(payload.timeExtensionCount);

      if (
        payload.extendedBy &&
        userId &&
        payload.extendedBy !== userId &&
        !endingRef.current
      ) {
        toast.info(
          `${payload.extendedByName || "A participant"} added ${
            payload.extensionMinutes || CHANNEL_EXTENSION_MINUTES
          } more minutes.`,
        );
      }
    };

    const handleCallEnded = (payload: {
      callSessionId?: string;
      endedBy?: string;
    }) => {
      if (payload.callSessionId !== callId) {
        return;
      }

      if (!endingRef.current && (!userId || payload.endedBy !== userId)) {
        toast.info("The call has ended.");
      }

      endingRef.current = true;
      navigateToChannel();
    };

    channel.bind(CHANNEL_TIMER_UPDATED_EVENT, handleTimerUpdated);
    channel.bind(CALL_ENDED_EVENT, handleCallEnded);

    return () => {
      channel.unbind(CHANNEL_TIMER_UPDATED_EVENT, handleTimerUpdated);
      channel.unbind(CALL_ENDED_EVENT, handleCallEnded);
      client.unsubscribe(getChannelPusherName(channelId));
    };
  }, [callId, channelId, navigateToChannel, userId]);

  const timeExtensionsRemaining = Math.max(
    0,
    MAX_CHANNEL_TIME_EXTENSIONS - timeExtensionCount,
  );
  const canExtendTime =
    Boolean(channelId) &&
    countdown > 0 &&
    countdown <= CHANNEL_WARNING_THRESHOLD_MS &&
    timeExtensionsRemaining > 0;
  const promptKey = timerDeadline
    ? `${timerDeadline}:${timeExtensionCount}`
    : null;

  useEffect(() => {
    if (!promptKey) {
      setShowExtensionPrompt(false);
      dismissedPromptKeyRef.current = null;
      return;
    }

    if (
      dismissedPromptKeyRef.current &&
      dismissedPromptKeyRef.current !== promptKey
    ) {
      dismissedPromptKeyRef.current = null;
    }

    if (!canExtendTime) {
      setShowExtensionPrompt(false);
      return;
    }

    if (!dismissedPromptKeyRef.current) {
      setShowExtensionPrompt(true);
    }
  }, [canExtendTime, promptKey]);

  const handleDismissExtensionPrompt = useCallback(() => {
    if (promptKey) {
      dismissedPromptKeyRef.current = promptKey;
    }
    setShowExtensionPrompt(false);
  }, [promptKey]);

  const handleExtendTime = useCallback(async () => {
    if (!channelId || isExtendingTime || !canExtendTime) return;

    setIsExtendingTime(true);
    try {
      const response = await fetch(`/api/channels/${channelId}/extend`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add more time.");
      }

      setTimerDeadline(data.timerDeadline);
      setTimeExtensionCount(data.timeExtensionCount);
      setShowExtensionPrompt(false);
      toast.success(`Added ${CHANNEL_EXTENSION_MINUTES} more minutes to the call.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add more time.");
    } finally {
      setIsExtendingTime(false);
    }
  }, [canExtendTime, channelId, isExtendingTime]);

  const handleEndCall = useCallback(() => {
    if (!callId || endingRef.current) return;

    endingRef.current = true;
    setIsEnding(true);

    void fetch(`/api/calls/${callId}/end`, {
      method: "POST",
      keepalive: true,
    }).catch((fetchError) => {
      console.error("Error setting call as ended", fetchError);
    });

    navigateToChannel();
  }, [callId, navigateToChannel]);

  const handleDisconnected = useCallback(() => {
    if (hasNavigatedRef.current) {
      return;
    }

    navigateToChannel();
  }, [navigateToChannel]);

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertTriangleIcon className="size-10 text-red-500" />
        <h2 className="text-xl font-bold">Call Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mt-4 rounded-full"
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <Loader2Icon className="size-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Connecting to the live room...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] isolate flex h-[100dvh] w-[100dvw] flex-col overflow-hidden bg-black text-white">
      {/* ── Top HUD bar ─────────────────────────────────────────── */}
      <div className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/80 px-3 py-2.5 backdrop-blur-sm">
        {/* Left: call label */}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-white/50">Live Call</p>
          <p className="truncate text-sm font-semibold text-white">Secure call room</p>
        </div>

        {/* Right: timer + actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Timer */}
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              countdown > 0 && countdown <= CHANNEL_WARNING_THRESHOLD_MS
                ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                : "border-white/10 bg-white/5 text-white/70",
            )}
          >
            <ClockIcon className="size-3.5" />
            {formatCountdown(countdown)}
          </div>

          {/* Add time */}
          {canExtendTime ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-amber-300/40 bg-amber-300/10 px-2.5 text-xs text-amber-100 hover:bg-amber-300/20 hover:text-amber-50"
              onClick={() => { void handleExtendTime(); }}
              disabled={isExtendingTime}
            >
              {isExtendingTime ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <>+{CHANNEL_EXTENSION_MINUTES}m</>
              )}
            </Button>
          ) : null}

          {/* End call */}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndCall}
            disabled={isEnding}
            className="gap-1.5 rounded-full px-3 shadow-lg"
          >
            {isEnding ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PhoneOffIcon className="size-3.5" />
            )}
            {isEnding ? "Leaving…" : "End"}
          </Button>
        </div>
      </div>

      {/* ── Extension prompt ────────────────────────────────────── */}
      {showExtensionPrompt ? (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-300/30 bg-[#201404]/95 p-4 shadow-2xl backdrop-blur-md">
            <p className="text-sm font-semibold text-amber-100">Time is almost over</p>
            <p className="mt-1 text-sm text-amber-50/80">
              Add {CHANNEL_EXTENSION_MINUTES} more minutes for both participants?
            </p>
            <p className="mt-1 text-xs text-amber-100/60">
              {timeExtensionsRemaining} extension{timeExtensionsRemaining === 1 ? "" : "s"} remaining
            </p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-amber-50 hover:bg-white/10 hover:text-white"
                onClick={handleDismissExtensionPrompt}
              >
                Later
              </Button>
              <Button
                size="sm"
                className="rounded-full bg-amber-300 text-amber-950 hover:bg-amber-200"
                onClick={() => { void handleExtendTime(); }}
                disabled={isExtendingTime}
              >
                {isExtendingTime ? "Adding…" : `+${CHANNEL_EXTENSION_MINUTES} min`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── LiveKit room — fills remaining space ─────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          data-lk-theme="default"
          onDisconnected={handleDisconnected}
          className={cn(
            "h-full w-full",
            // Control bar: pill floating above bottom safe area
            "[&_.lk-control-bar]:fixed [&_.lk-control-bar]:bottom-6 [&_.lk-control-bar]:left-1/2 [&_.lk-control-bar]:-translate-x-1/2",
            "[&_.lk-control-bar]:z-40",
            "[&_.lk-control-bar]:flex [&_.lk-control-bar]:items-center [&_.lk-control-bar]:gap-1",
            "[&_.lk-control-bar]:rounded-[2rem] [&_.lk-control-bar]:border [&_.lk-control-bar]:border-white/15",
            "[&_.lk-control-bar]:bg-black/75 [&_.lk-control-bar]:px-3 [&_.lk-control-bar]:py-2",
            "[&_.lk-control-bar]:backdrop-blur-xl [&_.lk-control-bar]:shadow-xl",
            // Give control bar buttons a min tap target on mobile
            "[&_.lk-control-bar_.lk-button]:min-h-[44px] [&_.lk-control-bar_.lk-button]:min-w-[44px]",
            // Dropdown/popover menus: appear ABOVE the bar, high z-index
            "[&_.lk-media-device-menu]:z-50",
            "[&_.lk-button-group-menu]:z-50",
            "[&_.lk-button-group-menu]:bottom-full [&_.lk-button-group-menu]:top-auto",
            // Hide LiveKit's own disconnect button — we provide our own End button
            "[&_.lk-disconnect-button]:!hidden",
            // Video grid fills the room
            "[&_.lk-video-conference]:h-full [&_.lk-video-conference]:w-full",
            "[&_.lk-grid-layout]:h-full [&_.lk-grid-layout]:w-full",
            // On mobile: stack tiles vertically, full-bleed
            "[&_.lk-participant-tile]:w-full",
            // Add bottom padding so videos aren't hidden behind the control bar
            "[&_.lk-grid-layout]:pb-24",
          )}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
