"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlusIcon, Trash2Icon, MailIcon, EyeOffIcon, EyeIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notice = {
  _id: string;
  title: string;
  body: string;
  type: "ADVERTISEMENT" | "GENERAL" | "SPECIAL";
  targetAudience: "ALL" | "TEACHER" | "STUDENT" | "SPECIFIC";
  targetEmails: string[];
  isActive: boolean;
  createdAt: string;
};

export function NoticeClient() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<Notice["type"]>("GENERAL");
  const [targetAudience, setTargetAudience] = useState<Notice["targetAudience"]>("ALL");
  const [targetEmails, setTargetEmails] = useState("");

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notices");
      if (res.ok) {
        const data = await res.json();
        setNotices(data);
      }
    } catch {
      toast.error("Failed to load notices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const emailsArray = targetAudience === "SPECIFIC" 
        ? targetEmails.split(",").map(e => e.trim()).filter(Boolean)
        : [];

      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          type,
          targetAudience,
          targetEmails: emailsArray,
        }),
      });

      if (!res.ok) throw new Error("Failed to create notice");
      
      toast.success("Notice created and deployed");
      fetchNotices();
      setIsCreateOpen(false);
      setTitle("");
      setBody("");
      setType("GENERAL");
      setTargetAudience("ALL");
      setTargetEmails("");
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice forever?")) return;
    try {
      await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
      toast.success("Notice deleted");
      fetchNotices();
    } catch {
      toast.error("Failed to delete notice");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      toast.success(currentStatus ? "Notice deactivated" : "Notice activated");
      fetchNotices();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="w-4 h-4 mr-2" /> Create Notice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Notice</DialogTitle>
                <DialogDescription>
                  This notice will instantly pop up for the targeted users. Users only see it once.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Notice Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g. System Maintenance" required />
                </div>
                <div className="space-y-2">
                  <Label>Body Message</Label>
                  <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type the message here..." required rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {type === "GENERAL" ? "General" : type === "ADVERTISEMENT" ? "Advertisement" : type === "SPECIAL" ? "Special" : "Select type"}
                          <ChevronDownIcon className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[200px]">
                        <DropdownMenuItem onClick={() => setType("GENERAL")}>General</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setType("ADVERTISEMENT")}>Advertisement</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setType("SPECIAL")}>Special</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {targetAudience === "ALL" ? "All Users" : targetAudience === "TEACHER" ? "Teachers Only" : targetAudience === "STUDENT" ? "Students Only" : targetAudience === "SPECIFIC" ? "Specific Emails" : "Select audience"}
                          <ChevronDownIcon className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[200px]">
                        <DropdownMenuItem onClick={() => setTargetAudience("ALL")}>All Users</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTargetAudience("TEACHER")}>Teachers Only</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTargetAudience("STUDENT")}>Students Only</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTargetAudience("SPECIFIC")}>Specific Emails</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {targetAudience === "SPECIFIC" && (
                  <div className="space-y-2">
                    <Label>Specific Emails (comma separated)</Label>
                    <Input value={targetEmails} onChange={e => setTargetEmails(e.target.value)} placeholder="user1@example.com, user2@example.com" required />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>Publish Notice</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading notices...</p>
        ) : notices.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notices created yet.</p>
        ) : (
          notices.map((notice) => (
            <Card key={notice._id} className={!notice.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base line-clamp-1" title={notice.title}>{notice.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {format(new Date(notice.createdAt), "MMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                    {notice.type}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">
                  {notice.body}
                </p>
                
                <div className="flex items-center text-xs text-muted-foreground font-medium">
                  Audience: <span className="ml-1 text-foreground">{notice.targetAudience}</span>
                  {notice.targetAudience === "SPECIFIC" && (
                    <span title={notice.targetEmails.join(", ")}>
                      <MailIcon className="w-3 h-3 ml-2 text-primary" />
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(notice._id, notice.isActive)}>
                    {notice.isActive ? <><EyeOffIcon className="w-4 h-4 mr-1"/> Deactivate</> : <><EyeIcon className="w-4 h-4 mr-1"/> Activate</>}
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(notice._id)}>
                    <Trash2Icon className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
