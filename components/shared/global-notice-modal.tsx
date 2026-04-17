"use client";

import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MegaphoneIcon, PartyPopperIcon, InfoIcon } from "lucide-react";

type Notice = {
  _id: string;
  title: string;
  body: string;
  type: "ADVERTISEMENT" | "GENERAL" | "SPECIAL";
};

export function GlobalNoticeModal() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [currentNotice, setCurrentNotice] = useState<Notice | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      
      if (!res.ok) {
        console.log("[GlobalNoticeModal] API Error:", res.status, data);
        return;
      }
      
      console.log("[GlobalNoticeModal] Fetched notices:", data.length);
      
      if (Array.isArray(data) && data.length > 0) {
        setNotices(data);
      }
    } catch (err) {
      console.log("[GlobalNoticeModal] Fetch exception:", err);
    }
  }, []);

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

  const handleDismiss = async () => {
    if (!currentNotice) return;
    
    setIsDismissing(true);
    try {
      await fetch(`/api/notices/${currentNotice._id}/dismiss`, { method: "POST" });
      
      // Update local state to remove the notice and pick the next one
      const remaining = notices.filter(n => n._id !== currentNotice._id);
      setNotices(remaining);
      setCurrentNotice(remaining.length > 0 ? remaining[0] : null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDismissing(false);
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
            onClick={handleDismiss} 
            disabled={isDismissing}
          >
            {isDismissing ? "Closing..." : "Ok, got it!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
