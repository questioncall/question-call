"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import imageCompression from "browser-image-compression";
import {
  PaperclipIcon,
  MicIcon,
  SendIcon,
  SquareIcon,
  Loader2Icon,
  XIcon,
  FileIcon,
  ClockIcon,
  AlertTriangleIcon,
  LockIcon,
  InfoIcon,
  StarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import {
  CHANNEL_MESSAGE_EVENT,
  CHANNEL_STATUS_EVENT,
  CHANNEL_MESSAGES_SEEN_EVENT,
  MESSAGE_MARKED_EVENT,
  ANSWER_SUBMITTED_EVENT,
  CHANNEL_CLOSED_EVENT,
  getChannelPusherName,
} from "@/lib/pusher/events";
import {
  setChannelLoading,
  setChannelData,
  setChannelError,
  addMessage,
  updateMessage,
  removeMessage,
  setChannelStatus,
  setChannelRating,
  setAnswerSubmitted,
  toggleMessageMarked,
  markMessagesAsSeen,
  markOwnMessagesAsSeen,
  clearActiveChannel,
} from "@/store/features/channel/channel-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ChatMessage, ChannelStatus } from "@/types/channel";

type ChannelChatProps = {
  channelId: string;
};

type PendingFile = {
  file: File;
  type: "image" | "video" | "audio" | "raw";
  previewUrl: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;



function formatCountdown(ms: number) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatMessageDate(dateString: string) {
  if (!dateString) return "Today";
  const date = new Date(dateString);
  const now = new Date();
  
  const isToday = 
    date.getDate() === now.getDate() && 
    date.getMonth() === now.getMonth() && 
    date.getFullYear() === now.getFullYear();
    
  if (isToday) return "Today";
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = 
    date.getDate() === yesterday.getDate() && 
    date.getMonth() === yesterday.getMonth() && 
    date.getFullYear() === yesterday.getFullYear();
    
  if (isYesterday) return "Yesterday";
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMessageTime(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ChannelChat({ channelId }: ChannelChatProps) {
  const dispatch = useAppDispatch();
  const { channel, messages, isLoaded, isLoading, error, isAnswerSubmitted } = useAppSelector(
    (state) => state.channel,
  );
  const userId = useAppSelector((state) => state.user.id);

  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number>(0);

  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Fetch channel data from API ───────────────────────
  const fetchChannelData = useCallback(async () => {
    dispatch(setChannelLoading());
    try {
      const res = await fetch(`/api/channels/${channelId}`);
      if (!res.ok) {
        const data = await res.json();
        dispatch(setChannelError(data.error || "Failed to load channel"));
        return;
      }
      const data = await res.json();
      dispatch(setChannelData({ channel: data.channel, messages: data.messages }));
    } catch {
      dispatch(setChannelError("Failed to load channel"));
    }
  }, [channelId, dispatch]);

  useEffect(() => {
    fetchChannelData();
    return () => {
      dispatch(clearActiveChannel());
    };
  }, [fetchChannelData, dispatch]);

  // ─── Countdown timer ──────────────────────────────────
  useEffect(() => {
    if (!channel?.timerDeadline) return;

    const updateCountdown = () => {
      const remaining = new Date(channel.timerDeadline).getTime() - Date.now();
      setCountdown(Math.max(0, remaining));
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [channel?.timerDeadline]);

  // ─── Pusher real-time subscription ─────────────────────
  useEffect(() => {
    if (!channelId) return;

    const client = getPusherClient();
    if (!client) return;

    const pusherChannelName = getChannelPusherName(channelId);
    const pusherChannel = client.subscribe(pusherChannelName);

    const handleMessage = (payload: { message?: ChatMessage }) => {
      if (!payload.message) return;
      // Don't add our own messages (we already have them optimistically)
      if (payload.message.senderId === userId) return;
      dispatch(addMessage({ ...payload.message, isOwn: false }));
    };

    const handleStatus = (payload: { status?: ChannelStatus }) => {
      if (payload.status) {
        dispatch(setChannelStatus(payload.status));
      }
    };

    const handleMessagesSeen = (payload: { seenByUserId?: string }) => {
      // If the OTHER person saw the messages
      if (payload.seenByUserId !== userId) {
        dispatch(markOwnMessagesAsSeen());
      }
    };

    const handleAnswerSubmitted = () => {
      dispatch(setAnswerSubmitted(true));
    };

    const handleChannelClosed = (payload: { status?: ChannelStatus; ratingGiven?: number }) => {
      if (payload.status) {
        dispatch(setChannelStatus(payload.status));
      }
      if (payload.ratingGiven) {
        dispatch(setChannelRating(payload.ratingGiven));
      }
    };

    const handleMessageMarked = (payload: { messageId: string; isMarkedAsAnswer: boolean }) => {
      dispatch(toggleMessageMarked(payload));
    };

    pusherChannel.bind(CHANNEL_MESSAGE_EVENT, handleMessage);
    pusherChannel.bind(CHANNEL_STATUS_EVENT, handleStatus);
    pusherChannel.bind(CHANNEL_MESSAGES_SEEN_EVENT, handleMessagesSeen);
    pusherChannel.bind(ANSWER_SUBMITTED_EVENT, handleAnswerSubmitted);
    pusherChannel.bind(CHANNEL_CLOSED_EVENT, handleChannelClosed);
    pusherChannel.bind(MESSAGE_MARKED_EVENT, handleMessageMarked);

    return () => {
      pusherChannel.unbind(CHANNEL_MESSAGE_EVENT, handleMessage);
      pusherChannel.unbind(CHANNEL_STATUS_EVENT, handleStatus);
      pusherChannel.unbind(CHANNEL_MESSAGES_SEEN_EVENT, handleMessagesSeen);
      pusherChannel.unbind(ANSWER_SUBMITTED_EVENT, handleAnswerSubmitted);
      pusherChannel.unbind(CHANNEL_CLOSED_EVENT, handleChannelClosed);
      pusherChannel.unbind(MESSAGE_MARKED_EVENT, handleMessageMarked);
      client.unsubscribe(pusherChannelName);
    };
  }, [channelId, userId, dispatch]);

  // ─── Auto-scroll ──────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingFile]);

  // ─── Mark messages as seen ────────────────────────────
  useEffect(() => {
    if (!channelId || !isLoaded || messages.length === 0) return;

    const hasUnseen = messages.some((m) => !m.isOwn && !m.isSeen);
    if (hasUnseen) {
      dispatch(markMessagesAsSeen());
      fetch(`/api/channels/${channelId}/read`, { method: "POST" }).catch(console.error);
    }
  }, [channelId, isLoaded, messages, dispatch]);

  // ─── Cleanup on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    };
  }, [pendingFile]);

  // ─── Upload file ──────────────────────────────────────
  const uploadFileToServer = async (file: File): Promise<string> => {
    let fileToUpload = file;

    if (file.type.startsWith("image/") && !file.type.includes("gif")) {
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch (err) {
        console.error("Compression failed:", err);
      }
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  // ─── File select ──────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    let mediaType: PendingFile["type"] = "raw";
    if (file.type.startsWith("image/")) mediaType = "image";
    else if (file.type.startsWith("video/")) mediaType = "video";
    else if (file.type.startsWith("audio/")) mediaType = "audio";

    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);

    setPendingFile({
      file,
      type: mediaType,
      previewUrl: URL.createObjectURL(file),
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Send message ────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() && !pendingFile) return;
    if (channel?.status !== "ACTIVE") return;

    const messageText = text.trim();
    const currentPendingFile = pendingFile;

    setText("");
    setPendingFile(null);

    const tempId = `temp_${Date.now()}`;
    const mediaTypeMap: Record<string, string> = {
      image: "IMAGE",
      video: "VIDEO",
      audio: "AUDIO",
      raw: "TEXT",
    };

    // Optimistic add
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channelId,
      senderId: userId || "",
      senderName: "You",
      content: messageText,
      isOwn: true,
      isSystemMessage: false,
      mediaType: currentPendingFile
        ? (mediaTypeMap[currentPendingFile.type] as ChatMessage["mediaType"])
        : null,
      mediaUrl: currentPendingFile?.previewUrl || null,
      isSending: !!currentPendingFile,
      isSeen: false,
      isDelivered: false,
      sentAt: new Date().toISOString(),
    };

    dispatch(addMessage(optimisticMsg));

    let mediaUrl: string | undefined;

    // Upload file if present
    if (currentPendingFile) {
      try {
        mediaUrl = await uploadFileToServer(currentPendingFile.file);
        dispatch(
          updateMessage({
            id: tempId,
            updates: { isSending: false, mediaUrl },
          }),
        );
      } catch (err) {
        console.error(err);
        dispatch(removeMessage(tempId));
        toast.error("Failed to upload the attached file.");
        return;
      }
    }

    // Send to API
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageText || undefined,
          mediaUrl: mediaUrl || undefined,
          mediaType: currentPendingFile
            ? mediaTypeMap[currentPendingFile.type]
            : undefined,
        }),
      });

      if (res.ok) {
        const savedMsg: ChatMessage = await res.json();
        // Replace temp with real ID
        dispatch(
          updateMessage({
            id: tempId,
            updates: { id: savedMsg.id, isSending: false },
          }),
        );
      } else {
        dispatch(removeMessage(tempId));
      }
    } catch {
      dispatch(removeMessage(tempId));
    }
  };

  // ─── Voice recording ──────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const file = new File([audioBlob], `voice-${Date.now()}.wav`, { type: "audio/wav" });

        if (file.size > MAX_FILE_SIZE) {
          toast.error("Audio recording exceeded 10MB limit.");
          return;
        }

        const tempId = `temp_audio_${Date.now()}`;
        const previewUrl = URL.createObjectURL(file);

        dispatch(
          addMessage({
            id: tempId,
            channelId,
            senderId: userId || "",
            senderName: "You",
            content: "",
            isOwn: true,
            isSystemMessage: false,
            mediaType: "AUDIO",
            mediaUrl: previewUrl,
            isSending: true,
            isSeen: false,
            isDelivered: false,
            sentAt: new Date().toISOString(),
          }),
        );

        try {
          const secureUrl = await uploadFileToServer(file);

          const res = await fetch(`/api/channels/${channelId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaUrl: secureUrl, mediaType: "AUDIO" }),
          });

          if (res.ok) {
            const savedMsg: ChatMessage = await res.json();
            dispatch(
              updateMessage({
                id: tempId,
                updates: { id: savedMsg.id, isSending: false, mediaUrl: secureUrl },
              }),
            );
          } else {
            dispatch(removeMessage(tempId));
          }
        } catch {
          dispatch(removeMessage(tempId));
          toast.error("Failed to send audio message.");
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access denied or error occurred.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ─── Derived state ────────────────────────────────────
  const markedMessages = useMemo(
    () => messages.filter((m) => m.isOwn && !m.isSending && m.isMarkedAsAnswer),
    [messages],
  );
  const markedMessagesCount = markedMessages.length;

  // ─── Handlers ─────────────────────────────────────────

  // UI updates instantly; submit also sends the selected message IDs as a fallback.
  const syncMarkToServer = (messageId: string, nextMark: boolean) => {
    fetch(`/api/channels/${channelId}/mark-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, isMarkedAsAnswer: nextMark }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("[channel-chat] mark-answer sync failed", data?.error ?? res.statusText);
      }
    }).catch((error) => {
      console.error("[channel-chat] mark-answer request failed", error);
    });
  };

  // Non-async: dispatch is synchronous so React re-renders the star in the same frame
  const handleToggleMark = (messageId: string, currentMark: boolean) => {
    const nextMark = !currentMark;
    dispatch(toggleMessageMarked({ messageId, isMarkedAsAnswer: nextMark }));
    syncMarkToServer(messageId, nextMark);
  };


  const handleSubmitAnswer = async () => {
    if (markedMessagesCount === 0) {
      toast.error("Please mark at least one message as the answer.");
      return;
    }
    setIsSubmittingAnswer(true);
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          markedMessageIds: markedMessages.map((message) => message.id),
        }),
      });
      if (res.ok) {
        dispatch(setAnswerSubmitted(true));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit answer.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleCloseChannel = async () => {
    if (ratingValue < 1 || ratingValue > 5) {
      toast.error("Please provide a rating (1-5 stars).");
      return;
    }
    try {
      const res = await fetch(`/api/channels/${channelId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingValue }),
      });
      if (res.ok) {
        setIsRatingModalOpen(false);
        dispatch(setChannelStatus("CLOSED"));
        dispatch(setChannelRating(ratingValue));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to close channel.");
      }
    } catch {
      toast.error("Network error.");
    }
  };

  // ─── Derived state ────────────────────────────────────
  const isActive = channel?.status === "ACTIVE";
  const isClosed = channel?.status === "CLOSED";
  const isExpired = channel?.status === "EXPIRED";
  const isAsker = userId === channel?.askerId;
  const counterpartName = isAsker ? channel?.acceptorName : channel?.askerName;
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; messages: typeof messages }[] = [];
    let currentGroup: { dateLabel: string; messages: typeof messages } | null = null;

    messages.forEach((msg) => {
      const dateLabel = msg.sentAt ? formatMessageDate(msg.sentAt) : "Today";
      if (!currentGroup || currentGroup.dateLabel !== dateLabel) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { dateLabel, messages: [msg] };
      } else {
        currentGroup.messages.push(msg);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [messages]);

  // ─── Loading state ────────────────────────────────────
  if (isLoading || !isLoaded) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background gap-3">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading channel…</p>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────
  if (error || !channel) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background gap-3 p-8">
        <AlertTriangleIcon className="size-10 text-red-500" />
        <p className="text-base font-medium text-foreground">Channel not found</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {error || "This channel doesn't exist or you don't have access to it."}
        </p>
      </div>
    );
  }

  // ─── Countdown color ──────────────────────────────────
  const countdownUrgent = countdown > 0 && countdown < 5 * 60 * 1000; // < 5 min
  const countdownWarning = countdown > 0 && countdown < 15 * 60 * 1000; // < 15 min

  return (
    <div className="flex h-full flex-col bg-background relative">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3 sticky top-0 z-10">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground line-clamp-1">
            {channel.questionTitle}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-muted-foreground">
              {counterpartName}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              {channel.answerFormat} format
            </span>
            {isActive && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40 hidden sm:inline-block" />
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  {channel.formatDurationMinutes} min to answer
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions based on role and answer status */}
        <div className="flex items-center gap-3">
          {/* Timer */}
          {isActive && (
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
                countdownUrgent
                  ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                  : countdownWarning
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-border bg-background text-foreground"
              }`}
            >
              <ClockIcon className="size-4" />
              {countdown > 0 ? formatCountdown(countdown) : "Time's up"}
            </div>
          )}

          {isClosed && (
            <div className="flex items-center gap-2 rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400">
              <LockIcon className="size-4" />
              Closed
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400">
              <AlertTriangleIcon className="size-4" />
              Expired
            </div>
          )}

          {/* Teacher Submit Answer Button */}
          {!isAsker && isActive && !isAnswerSubmitted && (
            <Button
              size="sm"
              className="rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow shadow-blue-500/20 gap-1.5"
              onClick={handleSubmitAnswer}
              disabled={isSubmittingAnswer}
            >
              {isSubmittingAnswer ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  Submit Answer Now
                  {markedMessagesCount > 0 && (
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] tabular-nums font-bold">
                      {markedMessagesCount}
                    </span>
                  )}
                </>
              )}
            </Button>
          )}

          {/* Asker Close Channel Button */}
          {isAsker && isActive && isAnswerSubmitted && (
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full shadow-sm"
              onClick={() => setIsRatingModalOpen(true)}
            >
              Close Channel
            </Button>
          )}
        </div>
      </div>

      {/* ─── Status banners ─────────────────────────────── */}
      {isAnswerSubmitted && isActive && isAsker && (
        <div className="flex justify-between items-center w-full bg-blue-500/10 px-4 py-2 border-b border-blue-500/20 text-xs">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <InfoIcon className="size-3.5" />
            <span className="font-medium">Answer Submitted!</span> Please review and close the channel.
          </div>
          <Button
            size="sm"
            className="h-7 text-xs rounded-full bg-blue-600 text-white hover:bg-blue-700 px-3"
            onClick={() => setIsRatingModalOpen(true)}
          >
            Close & Rate
          </Button>
        </div>
      )}

      {isAnswerSubmitted && isActive && !isAsker && (
        <div className="flex justify-center w-full my-1">
          <div className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <InfoIcon className="size-3" />
            Answer submitted. Waiting for asker review.
          </div>
        </div>
      )}

      {isClosed && (
        <div className="flex justify-center w-full my-1">
          <div className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <LockIcon className="size-3" />
            Channel closed — read-only
          </div>
        </div>
      )}

      {isExpired && (
        <div className="flex justify-center w-full my-1">
          <div className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangleIcon className="size-3" />
            Channel expired — time limit exceeded
          </div>
        </div>
      )}

      {/* ─── Messages feed ──────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">


        {groupedMessages.map((group) => (
          <div key={group.dateLabel} className="space-y-6">
            <div className="flex w-full justify-center my-2">
              <span className="rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                {group.dateLabel}
              </span>
            </div>
            
            {group.messages.map((msg) => {
              const isOwn = msg.isOwn;

              // System messages get a special style
              if (msg.isSystemMessage) {
                return (
                  <div key={msg.id} className="flex w-full justify-center">
                    <div className="max-w-md rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5 text-sm text-primary text-center">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] lg:max-w-[60%] flex flex-col gap-1.5 ${
                      isOwn ? "items-end" : "items-start"
                    }`}
                  >
                    {!isOwn && (
                      <span className="text-xs font-medium text-muted-foreground ml-1">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      className={`group relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isOwn
                          ? "bg-[#183620] text-[#d4ebd9] dark:bg-[#d4ebd9] dark:text-[#183620] rounded-tr-sm"
                          : "bg-background text-foreground border rounded-tl-sm"
                      } ${
                        msg.isMarkedAsAnswer
                          ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-background border-transparent"
                          : isOwn ? "" : "border-border"
                      }`}
                    >
                      {/* Mark as answer toggle */}
                      {!isAsker && isOwn && isActive && !isAnswerSubmitted && (
                        <button
                          type="button"
                          className={`absolute -left-10 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 rounded-full ${
                            msg.isMarkedAsAnswer 
                              ? "text-yellow-500 opacity-100" 
                              : "text-muted-foreground opacity-0 group-hover:opacity-100"
                          } hover:text-yellow-500 hover:bg-yellow-500/10 transition-all`}
                          onClick={() => handleToggleMark(msg.id, msg.isMarkedAsAnswer ?? false)}
                          title={msg.isMarkedAsAnswer ? "Unmark part of answer" : "Mark as part of answer"}
                        >
                          <StarIcon className={`size-4 ${msg.isMarkedAsAnswer ? "fill-yellow-500" : ""}`} />
                        </button>
                      )}

                      {/* Small badge for asker view */}
                      {isAsker && msg.isMarkedAsAnswer && (
                        <div className="absolute -right-2 top-0 -translate-y-1/2 rounded-full bg-yellow-100 p-1 border border-yellow-200 shadow-sm">
                          <StarIcon className="size-3 text-yellow-600 fill-yellow-600" />
                        </div>
                      )}

                      {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                      {msg.mediaUrl && (
                        <div className="mt-1 relative">
                          {msg.isSending && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl z-10 backdrop-blur-sm">
                              <Loader2Icon className="size-5 animate-spin text-foreground" />
                            </div>
                          )}

                          {msg.mediaType === "IMAGE" && (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-full max-w-sm overflow-hidden rounded-xl bg-muted/50 border border-border"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.mediaUrl}
                                alt="Image attachment"
                                className="w-full object-cover"
                              />
                            </a>
                          )}

                          {msg.mediaType === "VIDEO" && (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="w-full max-w-sm rounded-xl overflow-hidden bg-muted/50 border border-border"
                            />
                          )}

                          {msg.mediaType === "AUDIO" && (
                            <div
                              className={`flex items-center gap-3 rounded-full py-1 ${
                                isOwn ? "text-background" : "text-foreground"
                              }`}
                            >
                              <audio
                                src={msg.mediaUrl}
                                controls
                                className="h-10 max-w-[240px]"
                              />
                            </div>
                          )}

                          {(!msg.mediaType || msg.mediaType === "TEXT") && msg.mediaUrl && (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 underline underline-offset-4 opacity-90 transition-opacity hover:opacity-100"
                            >
                              <FileIcon className="size-4" />
                              View Attachment
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Timestamp & Status */}
                      <div className={`text-[10px] items-center gap-1 opacity-70 mt-1 flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        {msg.sentAt ? formatMessageTime(msg.sentAt) : ""}
                        {isOwn && !msg.isSystemMessage && !msg.isSending && (
                          <span className={`${msg.isSeen ? "text-blue-400" : "text-muted-foreground"}`}>
                            {msg.isSeen ? " • Seen" : " • Delivered"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ─── Input Area ─────────────────────────────────── */}
      {isActive ? (
        <div className="shrink-0 border-t border-border bg-background p-2.5 sticky bottom-0 flex flex-col gap-2">
          {/* Pending file preview */}
          {pendingFile && (
            <div className="flex animate-in slide-in-from-bottom-2 fade-in items-center gap-3 rounded-lg border border-border bg-muted/40 p-2 max-w-xs relative">
              <button
                onClick={() => setPendingFile(null)}
                className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 shadow-sm hover:bg-muted"
              >
                <XIcon className="size-3 text-foreground" />
              </button>

              {pendingFile.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pendingFile.previewUrl}
                  alt="Preview"
                  className="size-10 object-cover rounded shadow-sm border border-border"
                />
              ) : pendingFile.type === "video" ? (
                <div className="size-10 flex items-center justify-center rounded shadow-sm border border-border bg-black/80 text-white">
                  <FileIcon className="size-5" />
                </div>
              ) : (
                <div className="size-10 flex items-center justify-center rounded shadow-sm border border-border bg-muted">
                  <FileIcon className="size-5 text-muted-foreground" />
                </div>
              )}

              <div className="truncate text-xs font-medium text-foreground">
                {pendingFile.file.name}
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*,audio/*"
            onChange={handleFileSelect}
          />

          {isRecording ? (
            <div className="flex items-center justify-between gap-4 rounded-full border border-border bg-muted/40 py-2 pl-6 pr-2">
              <div className="flex items-center gap-3 text-red-500">
                <div className="size-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-sm font-medium">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground rounded-full"
                  onClick={() => {
                    if (mediaRecorderRef.current) {
                      mediaRecorderRef.current.stream
                        .getTracks()
                        .forEach((t) => t.stop());
                      setIsRecording(false);
                      if (timerRef.current) clearInterval(timerRef.current);
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full size-9 bg-background border-border text-foreground hover:bg-muted"
                  onClick={stopRecording}
                >
                  <SquareIcon className="size-4 fill-current" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 rounded-full border-border bg-background hover:bg-muted text-foreground transition-transform active:scale-95"
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon className="size-4" />
                <span className="sr-only">Attach file</span>
              </Button>

              <div className="relative flex-1">
                <Input
                  placeholder="Type your message..."
                  className="min-h-12 w-full resize-none rounded-2xl border-border bg-muted/40 pr-10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-base py-3"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {text.trim() || pendingFile ? (
                <Button
                  type="button"
                  size="icon"
                  className="shrink-0 rounded-full size-10 bg-foreground text-background hover:bg-foreground/90 shadow-sm transition-transform active:scale-95"
                  onClick={() => void handleSend()}
                >
                  <SendIcon className="size-4 ml-0.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-full size-10 border-border bg-background shadow-sm hover:bg-muted transition-transform active:scale-95"
                  onClick={startRecording}
                >
                  <MicIcon className="size-5 text-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Disabled input for closed/expired channels */
        <div className="shrink-0 border-t border-border bg-muted/30 p-3 sticky bottom-0">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
            <LockIcon className="size-3.5" />
            <span>
              {isClosed
                ? "This channel is closed. You can view the history above."
                : "This channel has expired. Messages can no longer be sent."}
            </span>
          </div>
        </div>
      )}
      {/* ─── Rating Modal ───────────────────────────────── */}
      {isRatingModalOpen && isAsker && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-background rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full mx-auto flex flex-col items-center">
            <div className="size-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <StarIcon className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Rate Teacher</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Please rate the quality of the answer before closing the channel permanently.
            </p>
            
            <div className="flex gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className={`p-1 transition-transform hover:scale-110 active:scale-95 ${
                    ratingValue >= star ? "text-amber-500" : "text-muted border-none"
                  }`}
                >
                  <StarIcon className={`size-8 ${ratingValue >= star ? "fill-amber-500" : ""}`} />
                </button>
              ))}
            </div>

            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setIsRatingModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleCloseChannel}
                disabled={ratingValue === 0}
              >
                Submit & Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
