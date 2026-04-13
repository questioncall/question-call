"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, CheckIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SessionData = {
  _id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  instructorName: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number | null;
  status: string;
  zoomLink: string | null;
  notificationsSent: boolean;
  recordingUrl: string | null;
  notificationStats: { sent: number; failed: number };
};

type AdminLiveSessionsClientProps = {
  sessions: SessionData[];
};

export function AdminLiveSessionsClient({
  sessions: initialSessions,
}: AdminLiveSessionsClientProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [filter, setFilter] = useState<string>("all");

  const filteredSessions = sessions.filter((session) => {
    if (filter === "all") return true;
    return session.status === filter;
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case "SCHEDULED":
        return <Badge variant="outline">Scheduled</Badge>;
      case "LIVE":
        return <Badge className="bg-green-600">Live</Badge>;
      case "ENDED":
        return <Badge variant="secondary">Ended</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Live sessions</h1>
          <p className="text-sm text-muted-foreground">
            Monitor all live sessions across the platform.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="LIVE">Live</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Instructor</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notified</th>
                <th className="px-4 py-3 font-medium">Recording</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session._id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">
                      {session.courseTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.courseSlug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {session.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {session.instructorName}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDaysIcon className="size-3.5" />
                      {new Date(session.scheduledAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(session.status)}</td>
                  <td className="px-4 py-3">
                    {session.notificationsSent ? (
                      <div className="text-xs">
                        <span className="text-green-600">
                          +{session.notificationStats.sent}
                        </span>
                        {session.notificationStats.failed > 0 && (
                          <span className="text-red-600">
                            {" "}
                            -{session.notificationStats.failed}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">Not sent</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {session.recordingUrl ? (
                      <Badge>Available</Badge>
                    ) : session.status === "ENDED" ? (
                      <Badge variant="outline">Missing</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/courses/${session.courseSlug}/manage`}>
                        Manage
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSessions.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No live sessions found.
          </div>
        )}
      </div>
    </div>
  );
}