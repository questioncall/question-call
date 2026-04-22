import { getSafeServerSession } from "@/lib/auth";
import { getManageCoursePageData } from "@/lib/course-page-data";
import { redirect } from "next/navigation";
import { createNoIndexMetadata } from "@/lib/seo";
import { ManageCourseClient } from "./manage-course-client";

export const metadata = createNoIndexMetadata({
  title: "Manage Course",
  description: "Private instructor course management workspace.",
});

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSafeServerSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  if (session.user.role === "STUDENT") {
    redirect("/courses");
  }

  const data = await getManageCoursePageData({
    slug,
    userId: session.user.id,
    role: session.user.role,
  });

  if (!data) {
    redirect("/courses");
  }

  return (
    <ManageCourseClient
      course={data.course}
      sections={data.sections}
      liveSessions={data.liveSessions}
      analytics={data.analytics}
      commissionPercent={data.commissionPercent}
    />
  );
}
