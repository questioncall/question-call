"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CurrencyIcon,
  Layers3Icon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  Users2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateCourseModal } from "@/components/course/CreateCourseModal";
import { COURSE_UPDATED_EVENT, COURSE_UPDATES_CHANNEL } from "@/lib/pusher/events";
import { getPusherClient } from "@/lib/pusher/pusherClient";

type CourseData = {
  _id: string;
  title: string;
  slug: string;
  subject: string;
  level: string;
  pricingModel: string;
  price: number | null;
  status: string;
  isFeatured: boolean;
  instructorName: string;
  instructorRole: string;
  enrollmentCount: number;
  createdAt: string;
};

type AdminCoursesClientProps = {
  courses: CourseData[];
  analytics: {
    totalActiveCourses: number;
    activeBreakdown: { free: number; subscription: number; paid: number };
    totalEnrolled: number;
    totalRevenue: number;
    totalCommission: number;
  };
};

export function AdminCoursesClient({
  courses: initialCourses,
  analytics,
}: AdminCoursesClientProps) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [isWorking, setIsWorking] = useState(false);

  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    const client = getPusherClient();

    if (!client) {
      return;
    }

    const channel = client.subscribe(COURSE_UPDATES_CHANNEL);
    const handleCourseUpdated = () => {
      router.refresh();
    };

    channel.bind(COURSE_UPDATED_EVENT, handleCourseUpdated);

    return () => {
      channel.unbind(COURSE_UPDATED_EVENT, handleCourseUpdated);
      client.unsubscribe(COURSE_UPDATES_CHANNEL);
    };
  }, [router]);

  const filteredCourses = courses.filter((course) => {
    if (filter === "all") return true;
    return course.status === filter;
  });

  async function toggleFeatured(courseId: string, current: boolean) {
    setIsWorking(true);
    try {
      await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !current }),
      });
      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, isFeatured: !current } : c)),
      );
      toast.success(!current ? "Course featured." : "Course unfeatured.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setIsWorking(false);
    }
  }

  async function updateStatus(courseId: string, status: string) {
    setIsWorking(true);
    try {
      await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, status } : c)),
      );
      toast.success("Status updated.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteCourse(courseId: string) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      toast.success("Course deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setIsWorking(false);
    }
  }

  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      <CreateCourseModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Manage all courses and view analytics.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="mr-1 size-4" />
          Create course
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active courses</CardTitle>
            <Layers3Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{analytics.totalActiveCourses}</div>
            <p className="text-xs text-muted-foreground">
              Free: {analytics.activeBreakdown.free} · Sub:{" "}
              {analytics.activeBreakdown.subscription} · Paid:{" "}
              {analytics.activeBreakdown.paid}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total enrolled</CardTitle>
            <Users2Icon className="size-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{analytics.totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">Student enrollments</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Course revenue</CardTitle>
            <CurrencyIcon className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              NPR {analytics.totalRevenue.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From paid enrollments
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform commission</CardTitle>
            <CurrencyIcon className="size-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              NPR {analytics.totalCommission.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From paid enrollments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 w-[180px] rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                <th className="px-5 py-4 font-medium">Course</th>
                <th className="px-5 py-4 font-medium">Pricing</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Instructor</th>
                <th className="px-5 py-4 font-medium">Enrolled</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => (
                <tr
                  key={course._id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {course.isFeatured && (
                        <StarIcon className="size-4 text-yellow-500" />
                      )}
                      <div>
                        <div className="font-medium text-foreground line-clamp-1">
                          {course.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {course.subject} · {course.level}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {course.pricingModel === "FREE" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400">Free</Badge>
                    ) : course.pricingModel === "SUBSCRIPTION_INCLUDED" ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400">Subscription</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400">
                        NPR {(course.price ?? 0).toLocaleString()}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={course.status}
                      onChange={(e) => updateStatus(course._id, e.target.value)}
                      className="w-[120px] rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {course.instructorName}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-foreground">
                    {course.enrollmentCount}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeatured(course._id, course.isFeatured)}
                        disabled={isWorking}
                        className={course.isFeatured ? "text-yellow-500" : "text-muted-foreground"}
                      >
                        <StarIcon
                          className={`size-4 ${
                            course.isFeatured
                              ? "fill-yellow-500"
                              : ""
                          }`}
                        />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/courses/${course._id}`}>
                          <PencilIcon className="size-4" />
                        </Link>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                            <TrashIcon className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete course?</DialogTitle>
                            <DialogDescription>
                              This will permanently delete the course and all its
                              content. This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteCourse(course._id)}
                              disabled={isWorking}
                              className="flex-1"
                            >
                              Delete
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCourses.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No courses found.
          </div>
        )}
      </div>
    </div>
  );
}
