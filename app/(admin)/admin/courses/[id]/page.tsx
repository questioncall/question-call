import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  BookOpenIcon,
  CalendarIcon,
  EyeIcon,
  MoreVerticalIcon,
  PencilIcon,
  Users2Icon,
  VideoIcon,
  WalletIcon,
  ActivityIcon,
} from "lucide-react";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseSection from "@/models/CourseSection";
import CourseEnrollment from "@/models/CourseEnrollment";
import Transaction from "@/models/Transaction";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnrolledUsersModal } from "@/components/course/EnrolledUsersModal";

type Params = Promise<{ id: string }>;

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    ARCHIVED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return map[status] || "bg-muted text-muted-foreground";
}

function getPricingLabel(pricingModel: string, price?: number | null) {
  if (pricingModel === "FREE") return "Free";
  if (pricingModel === "SUBSCRIPTION_INCLUDED") return "Subscription";
  return `NPR ${(price ?? 0).toLocaleString()}`;
}

export default async function AdminCoursePage({ params }: { params: Params }) {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;
  await connectToDatabase();

  const course = await Course.findById(id).lean();
  if (!course) {
    redirect("/admin/courses");
  }

  const [enrollments, purchaseTransactions, sectionCount] = await Promise.all([
    CourseEnrollment.find({ courseId: course._id }).lean(),
    Transaction.find({ 
      type: "COURSE_PURCHASE", 
      status: "COMPLETED",
      "metadata.courseId": id 
    }).lean(),
    CourseSection.countDocuments({ courseId: course._id }),
  ]);

  const totalRevenue = purchaseTransactions.reduce(
    (sum, tx) => sum + (tx.metadata?.grossAmount ?? 0),
    0,
  );
  const totalCommission = purchaseTransactions.reduce(
    (sum, tx) =>
      sum + ((tx.metadata?.grossAmount ?? 0) - (tx.metadata?.netAmount ?? 0)),
    0,
  );

  const avgProgress = enrollments.length > 0 
    ? Math.round(enrollments.reduce((acc, en) => acc + (en.overallProgressPercent || 0), 0) / enrollments.length)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href="/admin/courses" className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
        {/* Thumbnail and Actions side */}
        <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-6">
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-muted border border-border relative shadow-sm">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex w-full h-full items-center justify-center text-muted-foreground/30 bg-muted/50">
                <VideoIcon className="size-16" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className={`${getStatusBadge(course.status)} border-transparent font-medium shadow-sm`}>
                {course.status}
              </Badge>
              <Badge variant="secondary" className="bg-background/90 backdrop-blur font-medium shadow-sm border-transparent">
                {getPricingLabel(course.pricingModel, course.price)}
              </Badge>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">Manage your course content and settings or preview how it looks to students.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-11 transition-all" asChild>
                <Link href={`/courses/${course.slug}/manage`}>
                  <PencilIcon className="size-4 mr-2" />
                  Course Studio (Edit)
                </Link>
              </Button>
              <Button variant="outline" className="w-full h-11 border-border shadow-sm hover:bg-muted/50 transition-all" asChild>
                <Link href={`/courses/${course.slug}`}>
                  <EyeIcon className="size-4 mr-2" />
                  Preview as Student
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Details and Stats side */}
        <div className="flex-1 space-y-8 min-w-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-3 text-foreground break-words">{course.title}</h1>
            <p className="text-muted-foreground leading-relaxed text-base">
              {course.description || "No description provided for this course."}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-emerald-500/30 transition-colors flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users2Icon className="size-4 text-emerald-500" />
                Enrolled
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">{enrollments.length}</div>
                <EnrolledUsersModal courseId={course._id.toString()} triggerClassName="ml-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50">
                    See All
                  </Button>
                </EnrolledUsersModal>
              </div>
            </div>
            
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-blue-500/30 transition-colors flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <WalletIcon className="size-4 text-blue-500" />
                Revenue
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-medium text-muted-foreground">NPR</span>
                <span className="text-3xl font-bold text-foreground">{totalRevenue.toFixed(0)}</span>
              </div>
            </div>
            
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-purple-500/30 transition-colors flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ActivityIcon className="size-4 text-purple-500" />
                Progress
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{avgProgress}</span>
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </div>
            </div>
            
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-amber-500/30 transition-colors flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BookOpenIcon className="size-4 text-amber-500" />
                Sections
              </div>
              <div className="text-3xl font-bold text-foreground">{sectionCount}</div>
            </div>
          </div>

          {/* Detailed Metadata Grid */}
          <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-6 py-4 border-b border-border flex items-center gap-2">
              <BarChart3Icon className="size-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Detailed Information</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="flex justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                <span className="text-muted-foreground text-sm font-medium">Instructor Name</span>
                <span className="font-semibold text-sm text-foreground">{course.instructorName}</span>
              </div>
              <div className="flex justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                <span className="text-muted-foreground text-sm font-medium">Subject Category</span>
                <span className="font-semibold text-sm text-foreground">{course.subject}</span>
              </div>
              <div className="flex justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                <span className="text-muted-foreground text-sm font-medium">Difficulty Level</span>
                <span className="font-semibold text-sm text-foreground">{course.level}</span>
              </div>
              <div className="flex justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                <span className="text-muted-foreground text-sm font-medium">Total Commission Earned by Platform</span>
                <span className="font-semibold text-sm text-red-500">NPR {totalCommission.toFixed(0)}</span>
              </div>
              <div className="flex justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                <span className="text-muted-foreground text-sm font-medium">Created On</span>
                <span className="font-semibold text-sm text-foreground">
                  {new Date(course.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}