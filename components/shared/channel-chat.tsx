"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { 
  PaperclipIcon, 
  MicIcon, 
  SendIcon, 
  SquareIcon, 
  Loader2Icon, 
  XIcon,
  FileIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  sender: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "raw";
  isOwn: boolean;
  isSending?: boolean;
};

type ChannelChatProps = {
  channelId: string;
  title: string;
  counterpart: string;
  requiredAnswer: string;
  initialMessages: Omit<Message, "id">[];
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export function ChannelChat({ channelId, title, counterpart, requiredAnswer, initialMessages }: ChannelChatProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.map((m, i) => ({ ...m, id: `msg_${i}` }))
  );
  
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<{ file: File; type: Message["mediaType"]; previewUrl: string } | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingFile]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    };
  }, [pendingFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large. Maximum size is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    let mediaType: Message["mediaType"] = "raw";
    if (file.type.startsWith("image/")) mediaType = "image";
    else if (file.type.startsWith("video/")) mediaType = "video";
    else if (file.type.startsWith("audio/")) mediaType = "audio";

    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);

    setPendingFile({
      file,
      type: mediaType,
      previewUrl: URL.createObjectURL(file)
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFileToServer = async (file: File): Promise<string> => {
    let fileToUpload = file;
    
    if (file.type.startsWith("image/") && !file.type.includes("gif")) {
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        });
      } catch (err) {
        console.error("Compression attached failed:", err);
        // gracefully fallback to original
      }
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  const handleSend = async () => {
    if (!text.trim() && !pendingFile) return;

    const messageText = text.trim();
    const currentPendingFile = pendingFile;
    
    setText("");
    setPendingFile(null);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender: "You",
      text: messageText,
      isOwn: true,
      mediaType: currentPendingFile?.type,
      mediaUrl: currentPendingFile?.previewUrl,
      isSending: !!currentPendingFile
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    if (currentPendingFile) {
      try {
        const secureUrl = await uploadFileToServer(currentPendingFile.file);
        setMessages((prev) => 
          prev.map(m => m.id === tempId ? { ...m, isSending: false, mediaUrl: secureUrl } : m)
        );
      } catch (err) {
        console.error(err);
        alert("Failed to upload the attached file.");
        setMessages((prev) => prev.filter(m => m.id !== tempId));
      }
    }
  };

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
        const file = new File([audioBlob], `voice-message-${Date.now()}.wav`, { type: "audio/wav" });
        
        if (file.size > MAX_FILE_SIZE) {
          alert("Audio recording exceeded 10MB limit.");
          return;
        }

        const tempId = `temp_audio_${Date.now()}`;
        const previewUrl = URL.createObjectURL(file);
        
        setMessages((prev) => [
          ...prev, 
          { id: tempId, sender: "You", isOwn: true, mediaType: "audio", mediaUrl: previewUrl, isSending: true }
        ]);

        try {
          const secureUrl = await uploadFileToServer(file);
          setMessages((prev) => 
            prev.map(m => m.id === tempId ? { ...m, isSending: false, mediaUrl: secureUrl } : m)
          );
        } catch (err) {
          console.error(err);
          alert("Failed to send audio message.");
          setMessages((prev) => prev.filter(m => m.id !== tempId));
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error(err);
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-full flex-col bg-background relative">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-muted-foreground">{counterpart}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40"></span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              {requiredAnswer === "ONE" ? "Text Answer" : requiredAnswer === "TWO" ? "Photo Answer" : requiredAnswer === "THREE" ? "Video Answer" : "Flexible"}
            </span>
          </div>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground shadow-sm">
          18m left
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.map((msg) => {
          const isOwn = msg.isOwn;
          return (
            <div key={msg.id} className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] lg:max-w-[60%] flex flex-col gap-1.5 ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && (
                  <span className="text-xs font-medium text-muted-foreground ml-1">
                    {msg.sender}
                  </span>
                )}
                
                <div
                  className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isOwn 
                      ? "bg-foreground text-background rounded-tr-sm shadow-sm" 
                      : "bg-background text-foreground border border-border rounded-tl-sm shadow-sm"
                  }`}
                >
                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                  
                  {msg.mediaUrl && (
                    <div className="mt-1 relative">
                      {msg.isSending && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl z-10 backdrop-blur-sm">
                           <Loader2Icon className="size-5 animate-spin text-foreground" />
                        </div>
                      )}

                      {msg.mediaType === "image" && (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="block w-full max-w-sm overflow-hidden rounded-xl bg-muted/50 border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.mediaUrl} alt="Image attachment" className="w-full object-cover" />
                        </a>
                      )}
                      
                      {msg.mediaType === "video" && (
                        <video src={msg.mediaUrl} controls className="w-full max-w-sm rounded-xl overflow-hidden bg-muted/50 border border-border" />
                      )}

                      {msg.mediaType === "audio" && (
                        <div className={`flex items-center gap-3 rounded-full py-1 ${isOwn ? "text-background" : "text-foreground"}`}>
                          <audio src={msg.mediaUrl} controls className="h-10 max-w-[240px]" />
                        </div>
                      )}

                      {msg.mediaType === "raw" && (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline underline-offset-4 opacity-90 transition-opacity hover:opacity-100">
                          <FileIcon className="size-4" />
                          View Attachment
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border bg-background p-4 sticky bottom-0 flex flex-col gap-3">
        {/* Pending File Preview UI */}
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
              <img src={pendingFile.previewUrl} alt="Preview" className="size-10 object-cover rounded shadow-sm border border-border" />
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

        {/* Hidden File Input */}
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
             <span className="font-mono text-sm font-medium">{formatDuration(recordingDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground rounded-full" onClick={() => {
                if (mediaRecorderRef.current) {
                  mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
                  setIsRecording(false);
                  if (timerRef.current) clearInterval(timerRef.current);
                }
              }}>
                Cancel
              </Button>
              <Button size="icon" variant="outline" className="rounded-full size-9 bg-background border-border text-foreground hover:bg-muted" onClick={stopRecording}>
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
    </div>
  );
}
