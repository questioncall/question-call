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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-background gap-4">
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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-background gap-4">
        <Loader2Icon className="size-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connecting to securely encrypted room...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] w-full flex-col bg-black text-white relative isolate">
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="destructive" 
          onClick={handleEndCall} 
          className="rounded-full shadow-lg gap-2"
        >
           <PhoneOffIcon className="size-4" /> End Call
        </Button>
      </div>
      <LiveKitRoom
        video={false} // Initially false, user can toggle
        audio={true}
        token={token}
        serverUrl={serverUrl}
        className="flex-1 w-full relative"
        data-lk-theme="default"
        onDisconnected={handleEndCall}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
