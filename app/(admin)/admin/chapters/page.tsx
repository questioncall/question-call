import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import ChapterEnrollment from "@/models/ChapterEnrollment";
import Transaction from "@/models/Transaction";
import { AdminChaptersClient } from "./admin-chapters-client";

export default async function AdminChaptersPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const [chapters, enrollments, purchaseTransactions] = await Promise.all([
    Chapter.find().sort({ createdAt: -1 }).lean(),
    ChapterEnrollment.find().select("chapterId").lean(),
    Transaction.find({ type: "CHAPTER_PURCHASE", status: "COMPLETED" })
      .select("metadata")
      .lean(),
  ]);

  const enrollmentCountByChapter = new Map<string, number>();
  enrollments.forEach((enrollment) => {
    const key = enrollment.chapterId.toString();
    enrollmentCountByChapter.set(key, (enrollmentCountByChapter.get(key) ?? 0) + 1);
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
  chapters.forEach((chapter) => {
    if (chapter.status === "ACTIVE") {
      if (chapter.pricingModel === "FREE") activeCounts.free++;
      else if (chapter.pricingModel === "SUBSCRIPTION_INCLUDED")
        activeCounts.subscription++;
      else if (chapter.pricingModel === "PAID") activeCounts.paid++;
    }
  });

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading chapters...</div>}>
      <AdminChaptersClient
        chapters={chapters.map((chapter) => ({
          _id: chapter._id.toString(),
          title: chapter.title,
          slug: chapter.slug,
          subject: chapter.subject,
          level: chapter.level,
          pricingModel: chapter.pricingModel,
          price: chapter.price,
          status: chapter.status,
          isFeatured: chapter.isFeatured,
          instructorName: chapter.instructorName,
          instructorRole: chapter.instructorRole,
          enrollmentCount:
            enrollmentCountByChapter.get(chapter._id.toString()) ?? 0,
          createdAt: chapter.createdAt.toString(),
        }))}
        analytics={{
          totalActiveChapters: chapters.filter((chapter) => chapter.status === "ACTIVE")
            .length,
          activeBreakdown: activeCounts,
          totalEnrolled: enrollments.length,
          totalRevenue,
          totalCommission,
        }}
      />
    </Suspense>
  );
}
