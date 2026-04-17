import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSafeServerSession } from "@/lib/auth";
import { AdminCoursesClient } from "./admin-courses-client";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
import Transaction from "@/models/Transaction";

export default async function AdminCoursesPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const [courses, enrollments, purchaseTransactions] = await Promise.all([
    Course.find().sort({ createdAt: -1 }).lean(),
    CourseEnrollment.find().select("courseId").lean(),
    Transaction.find({ type: "COURSE_PURCHASE", status: "COMPLETED" })
      .select("metadata")
      .lean(),
  ]);

  const enrollmentCountByCourse = new Map<string, number>();
  enrollments.forEach((enrollment) => {
    const key = enrollment.courseId.toString();
    enrollmentCountByCourse.set(key, (enrollmentCountByCourse.get(key) ?? 0) + 1);
  });

  const totalRevenue = purchaseTransactions.reduce(
    (sum, tx) => sum + (tx.metadata?.grossAmount ?? 0),
    0,
  );
  const totalCommission = purchaseTransactions.reduce(
    (sum, tx) =>
      sum + ((tx.metadata?.grossAmount ?? 0) - (tx.metadata?.netAmount ?? 0)),
    0,
  );

  const activeCounts = { free: 0, subscription: 0, paid: 0 };
  courses.forEach((course) => {
    if (course.status === "ACTIVE") {
      if (course.pricingModel === "FREE") activeCounts.free++;
      else if (course.pricingModel === "SUBSCRIPTION_INCLUDED")
        activeCounts.subscription++;
      else if (course.pricingModel === "PAID") activeCounts.paid++;
    }
  });

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading courses...</div>}>
      <AdminCoursesClient
        courses={courses.map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        subject: c.subject,
        level: c.level,
        pricingModel: c.pricingModel,
        price: c.price,
        status: c.status,
        isFeatured: c.isFeatured,
        instructorName: c.instructorName,
        instructorRole: c.instructorRole,
        enrollmentCount: enrollmentCountByCourse.get(c._id.toString()) ?? 0,
        createdAt: c.createdAt.toString(),
      }))}
      analytics={{
        totalActiveCourses: courses.filter((c) => c.status === "ACTIVE").length,
        activeBreakdown: activeCounts,
        totalEnrolled: enrollments.length,
        totalRevenue,
        totalCommission,
        }}
      />
    </Suspense>
  );
}