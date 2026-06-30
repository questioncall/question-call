"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { startPersistentCall } from "@/lib/persistent-call-events";

export default function CallSessionPage() {
  const params = useParams();
  const callId = params?.callId as string | undefined;

  useEffect(() => {
    if (callId) {
      startPersistentCall({ callSessionId: callId });
    }
  }, [callId]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Loader2Icon className="size-10 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Opening the live call room...
      </p>
    </div>
  );
}
