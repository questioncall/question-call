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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import {
  CHANNEL_MESSAGE_EVENT,
  CHANNEL_STATUS_EVENT,
  CHANNEL_MESSAGES_SEEN_EVENT,
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

const TIER_LABEL: Record<string, string> = {
  ONE: "Text Answer",
  TWO: "Photo Answer",
  THREE: "Video Answer",
  UNSET: "Flexible",
};

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
  const { channel, messages, isLoaded, isLoading, error } = useAppSelector(
    (state) => state.channel,
  );
  const userId = useAppSelector((state) => state.user.id);

  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number>(0);

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

    pusherChannel.bind(CHANNEL_MESSAGE_EVENT, handleMessage);
    pusherChannel.bind(CHANNEL_STATUS_EVENT, handleStatus);
    pusherChannel.bind(CHANNEL_MESSAGES_SEEN_EVENT, handleMessagesSeen);

    return () => {
      pusherChannel.unbind(CHANNEL_MESSAGE_EVENT, handleMessage);
      pusherChannel.unbind(CHANNEL_STATUS_EVENT, handleStatus);
      pusherChannel.unbind(CHANNEL_MESSAGES_SEEN_EVENT, handleMessagesSeen);
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
      alert("File is too large. Maximum size is 10MB.");
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
        alert("Failed to upload the attached file.");
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
          alert("Audio recording exceeded 10MB limit.");
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
          alert("Failed to send audio message.");
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
      alert("Microphone access denied or error occurred.");
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
  const isActive = channel?.status === "ACTIVE";
  const isClosed = channel?.status === "CLOSED";
  const isExpired = channel?.status === "EXPIRED";
  const timerExpired = countdown <= 0 && channel?.status === "ACTIVE";
  const isAsker = userId === channel?.askerId;
  const counterpartName = isAsker ? channel?.acceptorName : channel?.askerName;
  const tierLabel = TIER_LABEL[channel?.questionTier || "UNSET"];

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
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground line-clamp-1">
            {channel.questionTitle}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-muted-foreground">
              {counterpartName}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              {tierLabel}
            </span>
          </div>
        </div>

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
      </div>

      {/* ─── Status banners ─────────────────────────────── */}
      {isClosed && (
        <div className="mx-4 mt-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-3">
          <LockIcon className="size-5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Channel closed — read-only
            </p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70">
              This channel has been closed. You can still view the message history.
            </p>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-3">
          <AlertTriangleIcon className="size-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Channel expired — time limit exceeded
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70">
              The question has been reset and pushed back to the feed.
            </p>
          </div>
        </div>
      )}

      {/* ─── Messages feed ──────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Channel opened system message */}
        <div className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-1">
            <InfoIcon className="size-4" />
            <p className="font-medium text-foreground">Channel opened</p>
          </div>
          Timer started. {channel.acceptorName} has {channel.tierDurationMinutes} minutes to provide a{" "}
          {tierLabel.toLowerCase()} answer.
        </div>

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
                      className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isOwn
                          ? "bg-foreground text-background rounded-tr-sm shadow-sm"
                          : "bg-background text-foreground border border-border rounded-tl-sm shadow-sm"
                      }`}
                    >
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
        <div className="shrink-0 border-t border-border bg-background p-4 sticky bottom-0 flex flex-col gap-3">
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
                  className="min-h-12 w-full resize-none rounded-2xl border-border bg-muted/40 pr-12 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {text.trim() || pendingFile ? (
                <Button
                  type="button"
                  size="icon"
                  className="shrink-0 rounded-full size-12 bg-foreground text-background hover:bg-foreground/90 shadow-sm transition-transform active:scale-95"
                  onClick={() => void handleSend()}
                >
                  <SendIcon className="size-5 ml-0.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-full size-12 border-border bg-background shadow-sm hover:bg-muted transition-transform active:scale-95"
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
        <div className="shrink-0 border-t border-border bg-muted/30 p-4 sticky bottom-0">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
            <LockIcon className="size-4" />
            <span>
              {isClosed
                ? "This channel is closed. You can view the history above."
                : "This channel has expired. Messages can no longer be sent."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
