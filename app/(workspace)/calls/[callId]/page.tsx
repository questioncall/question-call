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
    <div className="fixed inset-0 z-[9999] isolate flex h-[100dvh] w-[100dvw] overflow-hidden flex-col bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-center px-4 py-4">
        <div className="pointer-events-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">
              Live Call
            </p>
            <p className="truncate text-sm font-medium text-white">
              Secure call room
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm sm:text-sm",
                countdown > 0 && countdown <= CHANNEL_WARNING_THRESHOLD_MS
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/5 text-white/85",
              )}
            >
              <ClockIcon className="size-4" />
              {formatCountdown(countdown)}
            </div>

            {canExtendTime ? (
              <Button
                variant="outline"
                className="rounded-full border-amber-300/40 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20 hover:text-amber-50"
                onClick={() => {
                  void handleExtendTime();
                }}
                disabled={isExtendingTime}
              >
                {isExtendingTime ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Adding time
                  </>
                ) : (
                  <>
                    +{CHANNEL_EXTENSION_MINUTES} min
                    <span className="text-[11px] text-current/80">
                      {timeExtensionsRemaining} left
                    </span>
                  </>
                )}
              </Button>
            ) : null}

            <Button
              variant="destructive"
              onClick={handleEndCall}
              disabled={isEnding}
              className="gap-2 rounded-full px-4 shadow-lg"
            >
              {isEnding ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PhoneOffIcon className="size-4" />
              )}
              {isEnding ? "Leaving..." : "End"}
            </Button>
          </div>
        </div>
      </div>

      {showExtensionPrompt ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-50 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-amber-300/30 bg-[#201404]/95 p-4 shadow-2xl backdrop-blur-md">
            <p className="text-sm font-semibold text-amber-100">
              Time is almost over
            </p>
            <p className="mt-1 text-sm text-amber-50/80">
              Add {CHANNEL_EXTENSION_MINUTES} more minutes for both participants?
            </p>
            <p className="mt-2 text-xs text-amber-100/70">
              {timeExtensionsRemaining} extension
              {timeExtensionsRemaining === 1 ? "" : "s"} remaining
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                className="rounded-full text-amber-50 hover:bg-white/10 hover:text-white"
                onClick={handleDismissExtensionPrompt}
              >
                Later
              </Button>
              <Button
                className="rounded-full bg-amber-300 text-amber-950 hover:bg-amber-200"
                onClick={() => {
                  void handleExtendTime();
                }}
                disabled={isExtendingTime}
              >
                {isExtendingTime ? "Adding..." : `Increase ${CHANNEL_EXTENSION_MINUTES} min`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        className="relative flex-1 w-full [&_.lk-button-group]:gap-1 [&_.lk-control-bar]:mb-4 [&_.lk-control-bar]:w-[calc(100%-1rem)] [&_.lk-control-bar]:max-w-[22rem] [&_.lk-control-bar]:rounded-3xl [&_.lk-control-bar]:border [&_.lk-control-bar]:border-white/10 [&_.lk-control-bar]:bg-black/70 [&_.lk-control-bar]:px-2 [&_.lk-control-bar]:py-2 [&_.lk-control-bar]:backdrop-blur-md [&_.lk-disconnect-button]:hidden sm:[&_.lk-control-bar]:w-auto sm:[&_.lk-control-bar]:max-w-none [&_.lk-grid-layout]:!flex [&_.lk-grid-layout]:!h-full [&_.lk-grid-layout]:!w-full [&_.lk-grid-layout]:!flex-col sm:[&_.lk-grid-layout]:!grid [&_.lk-participant-tile]:!absolute [&_.lk-participant-tile]:!inset-0 [&_.lk-participant-tile]:!w-full [&_.lk-participant-tile]:!h-full [&_.lk-participant-tile[data-lk-local-participant='true']]:!w-[100px] [&_.lk-participant-tile[data-lk-local-participant='true']]:!h-[140px] [&_.lk-participant-tile[data-lk-local-participant='true']]:!top-auto [&_.lk-participant-tile[data-lk-local-participant='true']]:!bottom-28 [&_.lk-participant-tile[data-lk-local-participant='true']]:!left-auto [&_.lk-participant-tile[data-lk-local-participant='true']]:!right-4 [&_.lk-participant-tile[data-lk-local-participant='true']]:!z-10 [&_.lk-participant-tile[data-lk-local-participant='true']]:!rounded-xl [&_.lk-participant-tile[data-lk-local-participant='true']]:!border [&_.lk-participant-tile[data-lk-local-participant='true']]:!border-white/20 [&_.lk-participant-tile[data-lk-local-participant='true']]:!shadow-xl sm:[&_.lk-participant-tile]:!relative sm:[&_.lk-participant-tile]:!inset-auto sm:[&_.lk-participant-tile[data-lk-local-participant='true']]:!w-auto sm:[&_.lk-participant-tile[data-lk-local-participant='true']]:!h-auto sm:[&_.lk-participant-tile[data-lk-local-participant='true']]:!rounded-none sm:[&_.lk-participant-tile[data-lk-local-participant='true']]:!border-none"
        data-lk-theme="default"
        onDisconnected={handleDisconnected}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
