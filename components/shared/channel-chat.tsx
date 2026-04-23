"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  PhoneIcon,
  VideoIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  PhoneMissedIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { getVideoDurationSeconds, uploadFileViaServer } from "@/lib/client-upload";
import { canDeleteChatMessage } from "@/lib/message-deletion";
import { getAnswerFormatLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import {
  CHANNEL_MESSAGE_EVENT,
  CHANNEL_STATUS_EVENT,
  CHANNEL_MESSAGES_SEEN_EVENT,
  MESSAGE_MARKED_EVENT,
  MESSAGE_DELETED_EVENT,
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
  setMessageDeleted,
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
  id: string;
  file: File;
  type: "image" | "video" | "audio" | "raw";
  previewUrl: string;
  durationSeconds?: number | null;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PENDING_ATTACHMENTS = 10;

function revokeObjectUrl(url?: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}



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

function getUploadLabel(type: PendingFile["type"] | "audio") {
  switch (type) {
    case "image":
      return "Uploading image";
    case "video":
      return "Uploading video";
    case "audio":
      return "Uploading audio";
    default:
      return "Uploading attachment";
  }
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

function formatCallDurationUI(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remainM = m % 60;
  return remainM > 0 ? `${h}h ${remainM}m` : `${h}h`;
}

export function ChannelChat({ channelId }: ChannelChatProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { channel, messages, isLoaded, isLoading, error, isAnswerSubmitted } = useAppSelector(
    (state) => state.channel,
  );
  const userId = useAppSelector((state) => state.user.id);

  const [startingCallType, setStartingCallType] = useState<"AUDIO" | "VIDEO" | null>(null);
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [countdown, setCountdown] = useState<number>(0);

  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const [ratingValue, setRatingValue] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{
    label: string;
    value: number;
    detail?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFilesRef = useRef<PendingFile[]>([]);

  // ─── Call Logic ──────────────────────────────────────
  // Outgoing call state is managed globally in workspace-shell.
  // We dispatch a custom event that workspace-shell listens to.
  const handleStartCall = async (mode: "AUDIO" | "VIDEO") => {
    if (!channelId || startingCallType !== null) return;
    setStartingCallType(mode);
    try {
      const res = await fetch("/api/calls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start call");
      }
      // Signal the global outgoing call overlay via custom DOM event
      window.dispatchEvent(
        new CustomEvent("qc:outgoing-call", {
          detail: { callSessionId: data.callSessionId, channelId, mode },
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error starting call");
    } finally {
      setStartingCallType(null);
    }
  };

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

    const handleStatus = (payload: {
      status?: ChannelStatus;
      ratingGiven?: number;
    }) => {
      if (payload.status) {
        dispatch(setChannelStatus(payload.status));
      }
      if (payload.ratingGiven) {
        dispatch(setChannelRating(payload.ratingGiven));
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

    const handleMessageDeleted = (payload: { messageId: string }) => {
      dispatch(setMessageDeleted({ messageId: payload.messageId }));
    };

    pusherChannel.bind(CHANNEL_MESSAGE_EVENT, handleMessage);
    pusherChannel.bind(CHANNEL_STATUS_EVENT, handleStatus);
    pusherChannel.bind(CHANNEL_MESSAGES_SEEN_EVENT, handleMessagesSeen);
    pusherChannel.bind(ANSWER_SUBMITTED_EVENT, handleAnswerSubmitted);
    pusherChannel.bind(CHANNEL_CLOSED_EVENT, handleChannelClosed);
    pusherChannel.bind(MESSAGE_MARKED_EVENT, handleMessageMarked);
    pusherChannel.bind(MESSAGE_DELETED_EVENT, handleMessageDeleted);
    // NOTE: Incoming call events are now handled globally in workspace-shell

    return () => {
      pusherChannel.unbind(CHANNEL_MESSAGE_EVENT, handleMessage);
      pusherChannel.unbind(CHANNEL_STATUS_EVENT, handleStatus);
      pusherChannel.unbind(CHANNEL_MESSAGES_SEEN_EVENT, handleMessagesSeen);
      pusherChannel.unbind(ANSWER_SUBMITTED_EVENT, handleAnswerSubmitted);
      pusherChannel.unbind(CHANNEL_CLOSED_EVENT, handleChannelClosed);
      pusherChannel.unbind(MESSAGE_MARKED_EVENT, handleMessageMarked);
      pusherChannel.unbind(MESSAGE_DELETED_EVENT, handleMessageDeleted);
      client.unsubscribe(pusherChannelName);
    };
  }, [channelId, userId, dispatch, router]);

  // ─── Auto-scroll ──────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingFiles]);

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
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      pendingFilesRef.current.forEach((pendingFile) => {
        revokeObjectUrl(pendingFile.previewUrl);
      });
    };
  }, []);

  // ─── Upload file ──────────────────────────────────────
  const uploadFileToServer = useCallback(async (
    file: File,
    options?: {
      durationSeconds?: number | null;
      onProgress?: (percent: number) => void;
    },
  ): Promise<{ url: string; publicId: string | null }> => {
    let fileToUpload = file;
    const durationSeconds = options?.durationSeconds ?? null;

    if (
      file.type.startsWith("video/") &&
      typeof durationSeconds === "number" &&
      channel?.maxVideoDurationMinutes &&
      durationSeconds > channel.maxVideoDurationMinutes * 60
    ) {
      throw new Error(`Video must be ${channel.maxVideoDurationMinutes} minutes or shorter.`);
    }

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

    const data = await uploadFileViaServer<{ secure_url: string; public_id?: string }>(fileToUpload, {
      fields:
        typeof durationSeconds === "number"
          ? { videoDurationSeconds: String(durationSeconds) }
          : undefined,
      onProgress: ({ percent }) => {
        options?.onProgress?.(percent);
      },
    });

    return { url: data.secure_url, publicId: data.public_id || null };
  }, [channel?.maxVideoDurationMinutes]);

  const removePendingFile = useCallback((pendingFileId: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((file) => file.id === pendingFileId);
      if (target) {
        revokeObjectUrl(target.previewUrl);
      }
      return prev.filter((file) => file.id !== pendingFileId);
    });
  }, []);

  // ─── File select ──────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_PENDING_ATTACHMENTS - pendingFiles.length;
    if (remainingSlots <= 0) {
      toast.error(`You can only attach up to ${MAX_PENDING_ATTACHMENTS} files at once.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more attachment slot${remainingSlots === 1 ? "" : "s"} available.`);
    }

    const nextPendingFiles: PendingFile[] = [];

    for (const file of selectedFiles.slice(0, remainingSlots)) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`${file.name} is not a supported image or video file.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      const mediaType: PendingFile["type"] = file.type.startsWith("video/")
        ? "video"
        : "image";

      let durationSeconds: number | null = null;

      if (mediaType === "video") {
        try {
          durationSeconds = await getVideoDurationSeconds(file);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "We couldn't read the selected video length.",
          );
          continue;
        }

        const maxVideoDurationMinutes = channel?.maxVideoDurationMinutes ?? 30;

        if (durationSeconds > maxVideoDurationMinutes * 60) {
          toast.error(`${file.name} must be ${maxVideoDurationMinutes} minutes or shorter.`);
          continue;
        }
      }

      nextPendingFiles.push({
        id: `${file.name}-${file.lastModified}-${file.size}-${Date.now()}-${nextPendingFiles.length}`,
        file,
        type: mediaType,
        previewUrl: URL.createObjectURL(file),
        durationSeconds,
      });
    }

    if (nextPendingFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...nextPendingFiles]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendSingleMessage = useCallback(
    async ({
      content,
      pendingFile,
      progressDetail,
    }: {
      content?: string;
      pendingFile?: PendingFile;
      progressDetail?: string;
    }) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const mediaTypeMap: Record<PendingFile["type"], ChatMessage["mediaType"]> = {
        image: "IMAGE",
        video: "VIDEO",
        audio: "AUDIO",
        raw: "TEXT",
      };

      dispatch(
        addMessage({
          id: tempId,
          channelId,
          senderId: userId || "",
          senderName: "You",
          content: content?.trim() || "",
          isOwn: true,
          isSystemMessage: false,
          mediaType: pendingFile ? mediaTypeMap[pendingFile.type] : null,
          mediaUrl: pendingFile?.previewUrl || null,
          isSending: Boolean(pendingFile),
          isSeen: false,
          isDelivered: false,
          sentAt: new Date().toISOString(),
        }),
      );

      let uploadedMedia: { url: string; publicId: string | null } | undefined;

      if (pendingFile) {
        try {
          setUploadProgress({
            label: getUploadLabel(pendingFile.type),
            value: 0,
            detail:
              progressDetail ||
              (pendingFile.type === "video" && channel?.maxVideoDurationMinutes
                ? `Max ${channel.maxVideoDurationMinutes} minutes per video`
                : pendingFile.file.name),
          });

          uploadedMedia = await uploadFileToServer(pendingFile.file, {
            durationSeconds: pendingFile.durationSeconds,
            onProgress: (percent) => {
              setUploadProgress({
                label: getUploadLabel(pendingFile.type),
                value: percent,
                detail:
                  progressDetail ||
                  (pendingFile.type === "video" && channel?.maxVideoDurationMinutes
                    ? `Max ${channel.maxVideoDurationMinutes} minutes per video`
                    : pendingFile.file.name),
              });
            },
          });
        } catch (error) {
          dispatch(removeMessage(tempId));
          throw error;
        } finally {
          setUploadProgress(null);
        }
      }

      try {
        const res = await fetch(`/api/channels/${channelId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content?.trim() || undefined,
            mediaUrl: uploadedMedia?.url || undefined,
            mediaType: pendingFile ? mediaTypeMap[pendingFile.type] : undefined,
            mediaPublicId: uploadedMedia?.publicId || undefined,
          }),
        });

        if (!res.ok) {
          dispatch(removeMessage(tempId));
          throw new Error("Failed to send message.");
        }

        const savedMsg: ChatMessage = await res.json();
        dispatch(
          updateMessage({
            id: tempId,
            updates: {
              id: savedMsg.id,
              isSending: false,
              isDelivered: true,
              mediaUrl: uploadedMedia?.url || null,
            },
          }),
        );

        if (pendingFile) {
          revokeObjectUrl(pendingFile.previewUrl);
        }
      } catch (error) {
        dispatch(removeMessage(tempId));
        throw error;
      }
    },
    [channel?.maxVideoDurationMinutes, channelId, dispatch, userId, uploadFileToServer],
  );

  // ─── Send message ────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() && pendingFiles.length === 0) return;
    if (channel?.status !== "ACTIVE") return;
    if (uploadProgress) return;

    const messageText = text.trim();
    const currentPendingFiles = pendingFiles;

    setText("");
    setPendingFiles([]);

    let textSent = messageText.length === 0;
    let attachmentIndex = 0;

    try {
      if (messageText && currentPendingFiles.length === 1) {
        await sendSingleMessage({
          content: messageText,
          pendingFile: currentPendingFiles[0],
        });
        textSent = true;
        attachmentIndex = 1;
        return;
      }

      if (messageText) {
        await sendSingleMessage({ content: messageText });
        textSent = true;
      }

      for (attachmentIndex = 0; attachmentIndex < currentPendingFiles.length; attachmentIndex += 1) {
        const pendingFile = currentPendingFiles[attachmentIndex];
        await sendSingleMessage({
          pendingFile,
          progressDetail:
            currentPendingFiles.length > 1
              ? `Uploading ${attachmentIndex + 1} of ${currentPendingFiles.length}`
              : pendingFile.file.name,
        });
      }
    } catch (error) {
      if (!textSent) {
        setText(messageText);
      }

      if (attachmentIndex < currentPendingFiles.length) {
        setPendingFiles(currentPendingFiles.slice(attachmentIndex));
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to send one or more attachments.",
      );
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
          setUploadProgress({
            label: getUploadLabel("audio"),
            value: 0,
          });

          const uploaded = await uploadFileToServer(file, {
            onProgress: (percent) => {
              setUploadProgress({
                label: getUploadLabel("audio"),
                value: percent,
              });
            },
          });

          const res = await fetch(`/api/channels/${channelId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mediaUrl: uploaded.url,
              mediaType: "AUDIO",
              mediaPublicId: uploaded.publicId || undefined,
            }),
          });

          if (res.ok) {
            const savedMsg: ChatMessage = await res.json();
            dispatch(
              updateMessage({
                id: tempId,
                updates: { id: savedMsg.id, isSending: false, mediaUrl: uploaded.url },
              }),
            );
          } else {
            dispatch(removeMessage(tempId));
          }
        } catch {
          dispatch(removeMessage(tempId));
          toast.error("Failed to send audio message.");
        } finally {
          setUploadProgress(null);
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

  // ─── Delete message (sender only) ─────────────────────
  const handleDeleteMessage = async (messageId: string) => {
    if (!channelId) return;
    // Optimistic update
    dispatch(setMessageDeleted({ messageId }));
    try {
      const res = await fetch(`/api/channels/${channelId}/messages/${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to delete message");
        // Note: we don't undo here — the Pusher event will confirm or a reload will fix state
      }
    } catch {
      toast.error("Failed to delete message");
    }
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
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-background px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground sm:line-clamp-1">
              {channel.questionTitle}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <span className="font-medium text-muted-foreground">{counterpartName}</span>
              <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                {getAnswerFormatLabel(channel.answerFormat)} required
              </span>
              {isActive && (
                <>
                  <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
                  <span>{channel.formatDurationMinutes} min to answer</span>
                </>
              )}
            </div>
          </div>

          {/* Actions based on role and answer status */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
            {isActive && countdown > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full border bg-muted/30 p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={startingCallType !== null}
                  className="size-8 rounded-full text-muted-foreground hover:bg-muted"
                  onClick={() => handleStartCall("AUDIO")}
                >
                  {startingCallType === "AUDIO" ? <Loader2Icon className="size-4 animate-spin" /> : <PhoneIcon className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={startingCallType !== null}
                  className="size-8 rounded-full text-muted-foreground hover:bg-muted"
                  onClick={() => handleStartCall("VIDEO")}
                >
                  {startingCallType === "VIDEO" ? <Loader2Icon className="size-4 animate-spin" /> : <VideoIcon className="size-4" />}
                </Button>
              </div>
            )}
            {isActive && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors sm:text-sm",
                  countdownUrgent
                    ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                    : countdownWarning
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-border bg-background text-foreground",
                )}
              >
                <ClockIcon className="size-4" />
                {countdown > 0 ? formatCountdown(countdown) : "Time's up"}
              </div>
            )}

            {isClosed && (
              <div className="flex items-center gap-2 rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 sm:text-sm">
                <LockIcon className="size-4" />
                Closed
              </div>
            )}

            {isExpired && (
              <div className="flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 sm:text-sm">
                <AlertTriangleIcon className="size-4" />
                Expired
              </div>
            )}

            {!isAsker && isActive && !isAnswerSubmitted && (
              <Button
                size="sm"
                className="min-w-[9rem] rounded-full gap-1.5 bg-blue-600 text-white shadow shadow-blue-500/20 hover:bg-blue-700 sm:min-w-0"
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
                    Submit Answer
                    {markedMessagesCount > 0 && (
                      <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                        {markedMessagesCount}
                      </span>
                    )}
                  </>
                )}
              </Button>
            )}

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
      </div>

      {/* ─── Status banners ─────────────────────────────── */}
      {isAnswerSubmitted && isActive && isAsker && (
        <div className="flex w-full flex-col gap-2 border-b border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-4">
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
        <div className="my-1 flex w-full justify-center px-3">
          <div className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <InfoIcon className="size-3" />
            Answer submitted. Waiting for asker review.
          </div>
        </div>
      )}

      {isClosed && (
        <div className="my-1 flex w-full justify-center px-3">
          <div className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <LockIcon className="size-3" />
            Channel closed — read-only
          </div>
        </div>
      )}

      {isExpired && (
        <div className="my-1 flex w-full justify-center px-3">
          <div className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangleIcon className="size-3" />
            Channel expired — time limit exceeded
          </div>
        </div>
      )}

      {/* ─── Messages feed ──────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:space-y-6 sm:px-4 sm:py-6 lg:px-6"
      >


        {groupedMessages.map((group) => (
          <div key={group.dateLabel} className="space-y-6">
            <div className="flex w-full justify-center my-2">
              <span className="rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                {group.dateLabel}
              </span>
            </div>
            
            {group.messages.map((msg) => {
              const isOwn = msg.isOwn;
              const canToggleMark = !isAsker && isOwn && isActive && !isAnswerSubmitted;
              const canDelete = canDeleteChatMessage(msg);

              // Deleted messages get a placeholder
              if (msg.isDeleted) {
                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm italic shadow-sm",
                        isOwn
                          ? "rounded-tr-sm bg-muted/40 text-muted-foreground"
                          : "rounded-tl-sm border border-border bg-muted/20 text-muted-foreground",
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <Trash2Icon className="size-3.5 opacity-50" />
                        This message was deleted
                      </span>
                      <div className={`text-[10px] opacity-50 mt-1 flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        {msg.sentAt ? formatMessageTime(msg.sentAt) : ""}
                      </div>
                    </div>
                  </div>
                );
              }

              // System messages get a special style
              if (msg.isSystemMessage) {
                // ── Call event bubble (WhatsApp-style) ──
                if (msg.callInfo) {
                  const ci = msg.callInfo;
                  const isOutgoing = ci.callerId === userId;
                  const isMissed = ci.status === "MISSED";
                  const isRejected = ci.status === "REJECTED";
                  const isVideo = ci.mode === "VIDEO";

                  const CallDirectionIcon = isMissed ? PhoneMissedIcon : isOutgoing ? PhoneOutgoingIcon : PhoneIncomingIcon;
                  const iconColor = isMissed || isRejected
                    ? "text-red-500"
                    : "text-emerald-500";
                  const label = isMissed
                    ? "Missed call"
                    : isRejected
                      ? "Declined call"
                      : isOutgoing
                        ? "Outgoing call"
                        : "Incoming call";

                  const durationLabel = ci.durationSeconds && ci.durationSeconds > 0
                    ? formatCallDurationUI(ci.durationSeconds)
                    : null;

                  return (
                    <div key={msg.id} className="flex w-full justify-center my-1">
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-5 py-3 shadow-sm max-w-xs">
                        <div className={`flex items-center justify-center size-9 rounded-full ${isMissed || isRejected ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                          {isVideo
                            ? <VideoIcon className={`size-4 ${iconColor}`} />
                            : <CallDirectionIcon className={`size-4 ${iconColor}`} />
                          }
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-foreground leading-tight">
                            {label}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                            {isVideo && <span>Video</span>}
                            {isVideo && durationLabel && <span>·</span>}
                            {durationLabel && <span>{durationLabel}</span>}
                            {(isVideo || durationLabel) && <span>·</span>}
                            <span>{msg.sentAt ? formatMessageTime(msg.sentAt) : ""}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── Generic system message ──
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
                    className={cn(
                      "flex max-w-[88%] flex-col gap-1.5 sm:max-w-[75%] lg:max-w-[60%]",
                      isOwn ? "items-end" : "items-start",
                    )}
                  >
                    {!isOwn && (
                      <span className="text-xs font-medium text-muted-foreground ml-1">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      className={cn(
                        "group relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                        isOwn
                          ? "rounded-tr-sm bg-[#183620] text-[#d4ebd9] dark:bg-[#d4ebd9] dark:text-[#183620]"
                          : "rounded-tl-sm border bg-background text-foreground",
                        msg.isMarkedAsAnswer
                          ? "border-transparent ring-2 ring-yellow-400 ring-offset-1 ring-offset-background"
                          : isOwn
                            ? ""
                            : "border-border",
                        canToggleMark ? "pr-10 md:pr-4" : "",
                      )}
                    >
                      {/* Mark as answer toggle */}
                      {canToggleMark && (
                        <button
                          type="button"
                          className={cn(
                            "absolute right-2 top-2 flex size-8 items-center justify-center rounded-full transition-all md:right-auto md:-left-10 md:top-1/2 md:-translate-y-1/2",
                            msg.isMarkedAsAnswer
                              ? "bg-yellow-500/10 text-yellow-500 opacity-100"
                              : "bg-background/80 text-muted-foreground opacity-90 backdrop-blur-sm hover:bg-yellow-500/10 hover:text-yellow-500 md:bg-transparent md:opacity-0 md:backdrop-blur-0 md:group-hover:opacity-100",
                          )}
                          onClick={() => handleToggleMark(msg.id, msg.isMarkedAsAnswer ?? false)}
                          title={msg.isMarkedAsAnswer ? "Unmark part of answer" : "Mark as part of answer"}
                        >
                          <StarIcon className={`size-4 ${msg.isMarkedAsAnswer ? "fill-yellow-500" : ""}`} />
                        </button>
                      )}

                      {/* Delete button (sender only) */}
                      {canDelete && (
                        <button
                          type="button"
                          className={cn(
                            "absolute right-2 flex size-7 items-center justify-center rounded-full transition-all",
                            "bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-red-500/10 hover:text-red-500",
                            "opacity-0 group-hover:opacity-100",
                            canToggleMark ? "bottom-2" : "top-2",
                          )}
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message"
                        >
                          <Trash2Icon className="size-3.5" />
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
                        <div className="relative mt-1 max-w-full">
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
                              className="block w-full max-w-full overflow-hidden rounded-xl border border-border bg-muted/50 sm:max-w-[18rem]"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.mediaUrl}
                                alt="Image attachment"
                                className="aspect-[4/3] max-h-[18rem] w-full object-cover"
                              />
                            </a>
                          )}

                          {msg.mediaType === "VIDEO" && (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="aspect-video w-full max-w-full overflow-hidden rounded-xl border border-border bg-muted/50 object-cover sm:max-w-[18rem]"
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
                                className="h-10 w-full max-w-[220px] sm:max-w-[240px]"
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
        <div className="sticky bottom-0 flex shrink-0 flex-col gap-2 border-t border-border bg-background p-2.5">
          {/* Pending file preview */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {pendingFiles.length} of {MAX_PENDING_ATTACHMENTS} attachment{pendingFiles.length === 1 ? "" : "s"} queued
                </p>
                <button
                  type="button"
                  onClick={() => {
                    pendingFiles.forEach((pendingFile) => revokeObjectUrl(pendingFile.previewUrl));
                    setPendingFiles([]);
                  }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((pendingFile) => (
                  <div
                    key={pendingFile.id}
                    className="relative flex min-w-0 max-w-full animate-in items-center gap-3 rounded-lg border border-border bg-muted/40 p-2 fade-in slide-in-from-bottom-2 sm:max-w-sm"
                  >
                    <button
                      type="button"
                      onClick={() => removePendingFile(pendingFile.id)}
                      className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 shadow-sm hover:bg-muted"
                    >
                      <XIcon className="size-3 text-foreground" />
                    </button>

                    {pendingFile.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pendingFile.previewUrl}
                        alt="Preview"
                        className="h-12 w-12 rounded border border-border object-cover shadow-sm"
                      />
                    ) : pendingFile.type === "video" ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-black/80 text-white shadow-sm">
                        <FileIcon className="size-5" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-muted shadow-sm">
                        <FileIcon className="size-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-foreground">
                        {pendingFile.file.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {pendingFile.type === "video" && pendingFile.durationSeconds != null
                          ? `${formatDuration(Math.round(pendingFile.durationSeconds))} video`
                          : "Image attachment"}
                      </div>
                      {pendingFile.type === "video" && channel?.maxVideoDurationMinutes ? (
                        <div className="text-[11px] text-muted-foreground">
                          Max {channel.maxVideoDurationMinutes} minutes
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadProgress ? (
            <UploadProgressBar
              label={uploadProgress.label}
              value={uploadProgress.value}
              detail={uploadProgress.detail}
              className="w-full max-w-sm"
            />
          ) : null}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
          />

          {isRecording ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:rounded-full sm:py-2 sm:pl-6 sm:pr-2">
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
                disabled={!!uploadProgress || pendingFiles.length >= MAX_PENDING_ATTACHMENTS}
              >
                <PaperclipIcon className="size-4" />
                <span className="sr-only">Attach images or videos</span>
              </Button>

              <div className="relative flex-1">
                <Input
                  placeholder="Type your message..."
                  className="min-h-11 w-full resize-none rounded-2xl border-border bg-muted/40 py-3 pr-10 text-base focus-visible:ring-1 focus-visible:ring-foreground/20"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {text.trim() || pendingFiles.length > 0 ? (
                <Button
                  type="button"
                  size="icon"
                  className="shrink-0 rounded-full size-10 bg-foreground text-background hover:bg-foreground/90 shadow-sm transition-transform active:scale-95"
                  onClick={() => void handleSend()}
                  disabled={!!uploadProgress}
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
                  disabled={!!uploadProgress}
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
          <div className="flex items-center justify-center gap-2 py-2 text-center text-xs text-muted-foreground">
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-blue-500/10">
              <StarIcon className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-center text-xl font-semibold">Rate Teacher</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Please rate the quality of the answer before closing the channel permanently.
            </p>
            
            <div className="mb-8 flex gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                  onClick={() => setRatingValue(star)}
                  className={cn(
                    "p-1 transition-transform hover:scale-110 active:scale-95",
                    ratingValue >= star
                      ? "text-amber-500"
                      : "text-slate-900 dark:text-slate-100",
                  )}
                >
                  <StarIcon
                    className={cn(
                      "size-8",
                      ratingValue >= star
                        ? "fill-amber-500 text-amber-500"
                        : "fill-transparent text-slate-900 [stroke-width:1.8] dark:text-slate-100",
                    )}
                  />
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
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
