"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MegaphoneIcon, PartyPopperIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";

type Notice = {
  _id: string;
  title: string;
  body: string;
  type: "ADVERTISEMENT" | "GENERAL" | "SPECIAL";
};

export function GlobalNoticeModal() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [currentNotice, setCurrentNotice] = useState<Notice | null>(null);
  const pendingDismissIdsRef = useRef(new Set<string>());

  const getVisibleNotices = useCallback((incomingNotices: Notice[]) => {
    return incomingNotices.filter(
      (notice) => !pendingDismissIdsRef.current.has(notice._id),
    );
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      
      if (!res.ok) {
        console.log("[GlobalNoticeModal] API Error:", res.status, data);
        return;
      }
      
      console.log("[GlobalNoticeModal] Fetched notices:", data.length);
      
      if (Array.isArray(data)) {
        const visibleNotices = getVisibleNotices(data);
        setNotices(visibleNotices);
        setCurrentNotice((existingNotice) => {
          if (
            existingNotice &&
            visibleNotices.some((notice) => notice._id === existingNotice._id)
          ) {
            return existingNotice;
          }

          return visibleNotices[0] ?? null;
        });
      }
    } catch (err) {
      console.log("[GlobalNoticeModal] Fetch exception:", err);
    }
  }, [getVisibleNotices]);

  // Fetch on mount + every 2 minutes
  useEffect(() => {
    fetchNotices();
    const interval = setInterval(fetchNotices, 120000);
    return () => clearInterval(interval);
  }, [fetchNotices]);

  // When notices load/change, grab the first one if we don't have one active
  useEffect(() => {
    if (notices.length > 0 && !currentNotice) {
      setCurrentNotice(notices[0]);
    }
  }, [notices, currentNotice]);

  const handleDismiss = async (noticeToDismiss = currentNotice) => {
    if (!noticeToDismiss) return;
    if (pendingDismissIdsRef.current.has(noticeToDismiss._id)) return;

    pendingDismissIdsRef.current.add(noticeToDismiss._id);
    const nextNotices = notices.filter((notice) => notice._id !== noticeToDismiss._id);
    setNotices(nextNotices);
    setCurrentNotice((current) => {
      if (!current || current._id !== noticeToDismiss._id) {
        return current;
      }

      return nextNotices[0] ?? null;
    });

    try {
      const response = await fetch(`/api/notices/${noticeToDismiss._id}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss notice");
      }

      pendingDismissIdsRef.current.delete(noticeToDismiss._id);
    } catch (err) {
      console.error(err);
      pendingDismissIdsRef.current.delete(noticeToDismiss._id);
      toast.error("Could not dismiss the notice. It will appear again.");
      fetchNotices();
    }
  };

  // Don't render if no notices
  if (notices.length === 0) {
    return null;
  }

  if (!currentNotice) return null;

  const renderIcon = () => {
    switch (currentNotice.type) {
      case "ADVERTISEMENT": return <MegaphoneIcon className="w-10 h-10 text-primary mb-2 mx-auto" />;
      case "SPECIAL": return <PartyPopperIcon className="w-10 h-10 text-amber-500 mb-2 mx-auto" />;
      case "GENERAL":
      default: return <InfoIcon className="w-10 h-10 text-emerald-500 mb-2 mx-auto" />;
    }
  };

  return (
    <Dialog open={!!currentNotice} onOpenChange={(open) => {
      if (!open) handleDismiss();
    }}>
      <DialogContent 
        className="w-full max-w-sm" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pt-4">
          {renderIcon()}
          <DialogTitle className="text-xl leading-6 text-center">{currentNotice.title}</DialogTitle>
          <DialogDescription className="sr-only">Notice popup</DialogDescription>
        </DialogHeader>
        
        <div className="py-2 text-center text-sm text-foreground/90 whitespace-pre-wrap max-h-40 overflow-y-auto px-1 scrollbar-thin">
          {currentNotice.body}
        </div>

        <DialogFooter className="sm:justify-center pt-2">
          <Button 
            className="w-full sm:w-auto min-w-[120px]" 
            onClick={() => {
              void handleDismiss();
            }}
          >
            Ok, got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
