import * as React from "react";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InviteFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  referralCode: string;
}

export function InviteFriendsDialog({
  open,
  onOpenChange,
  userName,
  referralCode,
}: InviteFriendsDialogProps) {
  const [emails, setEmails] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState("");

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${referralCode}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const emailList = emails
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes("@"));

    if (emailList.length === 0) {
      setError("Please enter at least one valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/referral/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailList,
          message: message.trim() || undefined,
          referralLink,
          referrerName: userName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitations");
      }

      setSent(true);
      setEmails("");
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setEmails("");
    setMessage("");
    setError("");
    onOpenChange(false);
  };

  return (
    <dialog
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
        open ? "visible" : "hidden"
      )}
      open={open}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            {sent ? "Invitations Sent! 🎉" : "Invite Friends"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleClose}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-muted-foreground mb-4">
              Your invitations have been sent! When your friends sign up, you&apos;ll both receive bonus questions.
            </p>
            <Button onClick={() => setSent(false)} variant="outline">
              Invite More Friends
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Email Addresses
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter multiple emails separated by commas or new lines
              </p>
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="friend@example.com&#10;another@example.com"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Personal Message <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey! Check out this awesome learning platform..."
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring mt-2"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Your referral link:</p>
              <code className="text-xs text-primary break-all">{referralLink}</code>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Sending..." : "Send Invitations"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
