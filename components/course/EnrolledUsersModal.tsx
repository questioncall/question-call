"use client";

import { useState } from "react";
import { Loader2Icon, SearchIcon, Users2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EnrolledUser = {
  id: string;
  accessType: string;
  enrolledAt: string | null;
  lastAccessedAt: string | null;
  overallProgressPercent: number;
  completedVideoCount: number;
  totalVideoCount: number;
  student: {
    id: string;
    name: string;
    email: string;
    username: string;
    userImage: string | null;
  };
};

export function EnrolledUsersModal({
  courseId,
  children,
  triggerClassName,
}: {
  courseId: string;
  children?: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<EnrolledUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  const handleOpen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpen(true);
    if (!loaded) {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses/${courseId}/enrollments`);
        if (!res.ok) throw new Error("Failed to load enrolled users");
        const data = await res.json();
        setUsers(Array.isArray(data.enrollments) ? data.enrollments : []);
        setLoaded(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load enrolled users");
      } finally {
        setLoading(false);
      }
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [u.student.name, u.student.email, u.student.username]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q));
  });

  return (
    <>
      <div onClick={handleOpen} className={triggerClassName}>
        {children || (
          <Button variant="outline" size="sm">
            See All Students
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[95vw] sm:max-w-3xl md:max-w-5xl lg:max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Enrolled Users</DialogTitle>
            <DialogDescription>
              Search and review every learner currently enrolled in this course.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or username"
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="size-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Users2Icon className="mx-auto size-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {users.length === 0
                    ? "No students are enrolled yet."
                    : "No enrolled users match your search."}
                </p>
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border">
                <div className="divide-y divide-border">
                  {filtered.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {enrollment.student.name}
                          </p>
                          <Badge variant="outline">{enrollment.accessType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.student.email}
                        </p>
                        {enrollment.student.username ? (
                          <p className="text-xs text-muted-foreground">
                            @{enrollment.student.username}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 sm:text-right">
                        <div>
                          <p className="text-xs uppercase tracking-wider">Progress</p>
                          <p className="font-medium text-foreground">
                            {enrollment.overallProgressPercent}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider">Videos</p>
                          <p className="font-medium text-foreground">
                            {enrollment.completedVideoCount}/{enrollment.totalVideoCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider">Enrolled</p>
                          <p className="font-medium text-foreground">
                            {enrollment.enrolledAt
                              ? new Date(enrollment.enrolledAt).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
