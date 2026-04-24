"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PhoneIcon, PhoneOffIcon, VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { type CallRingtone, DEFAULT_CALL_SETTINGS } from "@/lib/call-settings";
import { playCallTone } from "@/lib/call-tone-player";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────
const RING_TIMEOUT_MS = 30_000; // Auto-dismiss after 30 seconds

export type IncomingCallPayload = {
  callSessionId: string;
  channelId: string;
  callerName: string;
  callerImage: string | null;
  callerId: string;
  mode: "AUDIO" | "VIDEO";
};

type IncomingCallOverlayProps = {
  /** The incoming call to display, or null if none */
  call: IncomingCallPayload | null;
  /** Called when the overlay should be dismissed (accept/reject/timeout/cancel) */
  onDismiss: () => void;
  /** Optional incoming ringtone preset */
  ringtone?: CallRingtone;
  /** When true, keep the visual overlay but do not play ringtone audio */
  isSilent?: boolean;
};

export function IncomingCallOverlay({
  call,
  onDismiss,
  ringtone = DEFAULT_CALL_SETTINGS.incomingRingtone,
  isSilent = false,
}: IncomingCallOverlayProps) {
  const router = useRouter();
  const [acceptingCallId, setAcceptingCallId] = useState<string | null>(null);
  const [rejectingCallId, setRejectingCallId] = useState<string | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!call?.callSessionId) return;
    void router.prefetch(`/calls/${call.callSessionId}`);
  }, [call?.callSessionId, router]);

  // ── Ringtone playback ─────────────────────────────────────────
  useEffect(() => {
    if (!call || isSilent) return;

    stopToneRef.current?.();
    stopToneRef.current = playCallTone(ringtone, {
      loop: true,
      volume: 1,
    });

    return () => {
      stopToneRef.current?.();
      stopToneRef.current = null;
    };
  }, [call, isSilent, ringtone]);

  // ── Auto-timeout ──────────────────────────────────────────────
  useEffect(() => {
    if (!call) return;

    timeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          await fetch(`/api/calls/${call.callSessionId}/missed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timedOutBy: "callee",
              callerName: call.callerName,
            }),
          });
        } catch {
          // Best-effort timeout sync
        } finally {
          onDismiss();
        }
      })();
    }, RING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [call, onDismiss]);

  // ── Stop ringtone helper ──────────────────────────────────────
  const stopRingtone = useCallback(() => {
    stopToneRef.current?.();
    stopToneRef.current = null;
  }, []);

  // ── Accept handler ────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    const isAcceptingCurrentCall =
      call && acceptingCallId === call.callSessionId;
    const isRejectingCurrentCall =
      call && rejectingCallId === call.callSessionId;

    if (!call || isAcceptingCurrentCall || isRejectingCurrentCall) return;
    setAcceptingCallId(call.callSessionId);
    stopRingtone();

    try {
      const res = await fetch(`/api/calls/${call.callSessionId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept call");
      }
      onDismiss();
      router.push(`/calls/${call.callSessionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error accepting call");
      setAcceptingCallId(null);
    }
  }, [acceptingCallId, call, onDismiss, rejectingCallId, router, stopRingtone]);

  // ── Reject handler ────────────────────────────────────────────
  const handleReject = useCallback(async () => {
    const isAcceptingCurrentCall =
      call && acceptingCallId === call.callSessionId;
    const isRejectingCurrentCall =
      call && rejectingCallId === call.callSessionId;

    if (!call || isAcceptingCurrentCall || isRejectingCurrentCall) return;
    setRejectingCallId(call.callSessionId);
    stopRingtone();

    try {
      await fetch(`/api/calls/${call.callSessionId}/reject`, {
        method: "POST",
      });
    } catch {
      // Non-fatal — dismiss regardless
    }
    onDismiss();
  }, [acceptingCallId, call, onDismiss, rejectingCallId, stopRingtone]);

  if (!call) {
    return null;
  }

  const isAccepting = acceptingCallId === call.callSessionId;
  const isRejecting = rejectingCallId === call.callSessionId;
  const isVideo = call.mode === "VIDEO";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-label="Incoming call"
    >
      {/* Glass card */}
      <div
        className={cn(
          "relative mx-4 flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl p-8",
          "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
          "border border-white/10 shadow-2xl shadow-black/50",
          "animate-in fade-in slide-in-from-bottom-4 duration-300",
        )}
      >
        {/* Pulsing ring behind avatar */}
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/30" />
          <span className="absolute -inset-2 animate-pulse rounded-full bg-emerald-500/15" />

          {/* Avatar */}
          <div className="relative size-24 overflow-hidden rounded-full border-2 border-emerald-400/60 bg-slate-700">
            {call.callerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={call.callerImage}
                alt={call.callerName}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-3xl font-bold text-white/80">
                {call.callerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Caller info */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-xl font-semibold text-white">{call.callerName}</h2>
          <p className="flex items-center gap-1.5 text-sm text-emerald-400/90">
            {isVideo ? (
              <VideoIcon className="size-4" />
            ) : (
              <PhoneIcon className="size-4" />
            )}
            Incoming {isVideo ? "video" : "audio"} call…
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-8">
          {/* Reject */}
          <button
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
            className={cn(
              "group flex flex-col items-center gap-2",
              "transition-transform active:scale-90",
            )}
            aria-label="Reject call"
          >
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-full",
                "bg-red-500 shadow-lg shadow-red-500/30",
                "transition-colors hover:bg-red-600",
                (isAccepting || isRejecting) && "opacity-50",
              )}
            >
              <PhoneOffIcon className="size-7 text-white" />
            </div>
            <span className="text-xs font-medium text-red-400/90">Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            className={cn(
              "group flex flex-col items-center gap-2",
              "transition-transform active:scale-90",
            )}
            aria-label="Accept call"
          >
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-full",
                "bg-emerald-500 shadow-lg shadow-emerald-500/30",
                "transition-colors hover:bg-emerald-600",
                "animate-bounce",
                (isAccepting || isRejecting) && "animate-none opacity-50",
              )}
            >
              {isVideo ? (
                <VideoIcon className="size-7 text-white" />
              ) : (
                <PhoneIcon className="size-7 text-white" />
              )}
            </div>
            <span className="text-xs font-medium text-emerald-400/90">
              {isAccepting ? "Joining…" : "Accept"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
