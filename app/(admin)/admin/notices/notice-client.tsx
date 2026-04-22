"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  MailIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

type NoticeViewer = {
  _id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  userImage: string | null;
};

type NoticeViewersResponse = {
  noticeId: string;
  title: string;
  viewerCount: number;
  viewers: NoticeViewer[];
};

type NoticeViewMode = "list" | "grid";

function getAudienceLabel(audience: Notice["targetAudience"]) {
  switch (audience) {
    case "ALL":
      return "All users";
    case "TEACHER":
      return "Teachers only";
    case "STUDENT":
      return "Students only";
    case "SPECIFIC":
      return "Specific emails";
    default:
      return audience;
  }
}

function getViewerInitials(viewer: Pick<NoticeViewer, "name" | "email">) {
  const label = viewer.name || viewer.email || "U";

  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function NoticeClient() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeenDialogOpen, setIsSeenDialogOpen] = useState(false);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [viewerData, setViewerData] = useState<NoticeViewersResponse | null>(null);
  const [viewMode, setViewMode] = useState<NoticeViewMode>("list");

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<Notice["type"]>("GENERAL");
  const [targetAudience, setTargetAudience] = useState<Notice["targetAudience"]>("ALL");
  const [targetEmails, setTargetEmails] = useState("");

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notices");
      if (!res.ok) {
        throw new Error("Failed to fetch notices");
      }

      const data = await res.json();
      setNotices(Array.isArray(data) ? data : []);
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
      const emailsArray =
        targetAudience === "SPECIFIC"
          ? targetEmails.split(",").map((email) => email.trim()).filter(Boolean)
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

      if (!res.ok) {
        throw new Error("Failed to create notice");
      }

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
      const res = await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete notice");
      }

      toast.success("Notice deleted");
      fetchNotices();
    } catch {
      toast.error("Failed to delete notice");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle notice");
      }

      toast.success(currentStatus ? "Notice deactivated" : "Notice activated");
      fetchNotices();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const handleViewSeenBy = async (notice: Notice) => {
    setSelectedNotice(notice);
    setViewerData(null);
    setIsSeenDialogOpen(true);
    setIsLoadingViewers(true);

    try {
      const res = await fetch(`/api/admin/notices/${notice._id}/seen`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch notice viewers");
      }

      setViewerData(data);
    } catch {
      toast.error("Failed to load notice viewers");
    } finally {
      setIsLoadingViewers(false);
    }
  };

  const isGridView = viewMode === "grid";

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setViewMode((currentMode) => (currentMode === "list" ? "grid" : "list"))}
          >
            {isGridView ? "Switch to List View" : "Switch to Grid View"}
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto">
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
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="E.g. System Maintenance"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body Message</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Type the message here..."
                      required
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            {type === "GENERAL"
                              ? "General"
                              : type === "ADVERTISEMENT"
                                ? "Advertisement"
                                : "Special"}
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
                            {getAudienceLabel(targetAudience)}
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
                  {targetAudience === "SPECIFIC" ? (
                    <div className="space-y-2">
                      <Label>Specific Emails (comma separated)</Label>
                      <Input
                        value={targetEmails}
                        onChange={(e) => setTargetEmails(e.target.value)}
                        placeholder="user1@example.com, user2@example.com"
                        required
                      />
                    </div>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      "Publish Notice"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Notice queue</CardTitle>
            <CardDescription>
              Newest notices appear first. Use the toggle above to switch between list and grid layouts.
            </CardDescription>
          </CardHeader>
        </Card>

        <div
          className={cn(
            isGridView ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3",
          )}
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading notices...</p>
          ) : notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices created yet.</p>
          ) : (
            notices.map((notice) => (
              <Card
                key={notice._id}
                className={cn(
                  "border border-border/70 shadow-sm",
                  !notice.isActive && "opacity-60",
                  isGridView && "h-full",
                )}
              >
                <CardContent
                  className={cn(
                    "py-4",
                    isGridView
                      ? "flex h-full flex-col gap-4"
                      : "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{notice.title}</h3>
                      <Badge variant="secondary" className="h-6 px-2 text-[10px] uppercase tracking-wide">
                        {notice.type}
                      </Badge>
                      <Badge
                        variant={notice.isActive ? "default" : "outline"}
                        className="h-6 px-2 text-[10px] uppercase tracking-wide"
                      >
                        {notice.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(notice.createdAt), "MMM d, yyyy 'at' p")}</span>
                      <span className="size-1 rounded-full bg-muted-foreground/50" />
                      <span>Audience: {getAudienceLabel(notice.targetAudience)}</span>
                      {notice.targetAudience === "SPECIFIC" ? (
                        <>
                          <span className="size-1 rounded-full bg-muted-foreground/50" />
                          <span className="inline-flex items-center gap-1">
                            <MailIcon className="h-3.5 w-3.5" />
                            {notice.targetEmails.length} email{notice.targetEmails.length === 1 ? "" : "s"}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {notice.body}
                    </p>

                    {notice.targetAudience === "SPECIFIC" && notice.targetEmails.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {notice.targetEmails.map((email) => (
                          <Badge
                            key={`${notice._id}-${email}`}
                            variant="outline"
                            className="h-auto px-2 py-1 text-[10px] font-normal"
                          >
                            {email}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "flex shrink-0 flex-wrap gap-2",
                      isGridView
                        ? "mt-auto items-center"
                        : "items-center lg:max-w-[260px] lg:justify-end",
                    )}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSeenBy(notice)}
                      disabled={isLoadingViewers && selectedNotice?._id === notice._id}
                    >
                      {isLoadingViewers && selectedNotice?._id === notice._id ? (
                        <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <UsersIcon className="mr-1.5 h-4 w-4" />
                      )}
                      Seen by
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(notice._id, notice.isActive)}
                    >
                      {notice.isActive ? (
                        <>
                          <EyeOffIcon className="mr-1.5 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <EyeIcon className="mr-1.5 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(notice._id)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={isSeenDialogOpen}
        onOpenChange={(open) => {
          setIsSeenDialogOpen(open);
          if (!open) {
            setSelectedNotice(null);
            setViewerData(null);
            setIsLoadingViewers(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notice viewers</DialogTitle>
            <DialogDescription>
              {selectedNotice
                ? `Users who have dismissed "${selectedNotice.title}".`
                : "Users who have dismissed this notice."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {isLoadingViewers ? (
              <div className="flex min-h-32 items-center justify-center rounded-xl border border-border/70 bg-muted/20 text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Loading viewers...
              </div>
            ) : viewerData ? (
              <>
                <div className="text-xs font-medium text-muted-foreground">
                  {viewerData.viewerCount} user{viewerData.viewerCount === 1 ? "" : "s"}{" "}
                  {viewerData.viewerCount === 1 ? "has" : "have"} seen this notice.
                </div>
                {viewerData.viewers.length > 0 ? (
                  viewerData.viewers.map((viewer) => (
                    <div
                      key={viewer._id}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/15 p-3"
                    >
                      {viewer.userImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={viewer.userImage}
                          alt={viewer.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getViewerInitials(viewer)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {viewer.name}
                          </p>
                          <Badge
                            variant="outline"
                            className="h-5 px-2 text-[10px] uppercase tracking-wide"
                          >
                            {viewer.role}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
                        {viewer.username ? (
                          <p className="text-xs text-muted-foreground">@{viewer.username}</p>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                    No users have dismissed this notice yet.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                Viewer details could not be loaded for this notice.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
