"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2Icon, AlertTriangleIcon, PhoneOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CallSessionPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params?.callId as string;
  const endingRef = useRef(false);

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callId) return;

    let mounted = true;

    async function fetchToken() {
      try {
        const res = await fetch(`/api/calls/${callId}/token`);
        const data = await res.json();
        
        if (!mounted) return;

        if (!res.ok) {
          throw new Error(data.error || "Failed to join call.");
        }

        setToken(data.token);
        setServerUrl(data.serverUrl);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Error joining call");
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, [callId]);

  const handleEndCall = async () => {
    if (!callId || endingRef.current) return;
    endingRef.current = true;
    try {
      await fetch(`/api/calls/${callId}/end`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Error setting call as ended", e);
    }
    router.back();
  };

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertTriangleIcon className="size-10 text-red-500" />
        <h2 className="text-xl font-bold">Call Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4 rounded-full">
          Go Back
        </Button>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <Loader2Icon className="size-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connecting to securely encrypted room...</p>
      </div>
    );
  }

  return (
    <div className="relative isolate flex h-full min-h-0 w-full flex-col bg-black text-white">
      <div className="absolute inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-4 sm:px-0">
        <Button 
          variant="destructive" 
          onClick={handleEndCall} 
          className="w-full max-w-xs gap-2 rounded-full shadow-lg sm:w-auto"
        >
           <PhoneOffIcon className="size-4" /> End Call
        </Button>
      </div>
      <LiveKitRoom
        video={false} // Initially false, user can toggle
        audio={true}
        token={token}
        serverUrl={serverUrl}
        className="relative flex-1 w-full"
        data-lk-theme="default"
        onDisconnected={handleEndCall}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
