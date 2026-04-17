import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { PublicLanding } from "@/components/shared/public-landing";
import { WorkspaceHome } from "@/components/shared/workspace-home";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { GlobalNoticeModal } from "@/components/shared/global-notice-modal";
import { getDefaultPath, getSafeServerSession, getWorkspaceUser } from "@/lib/auth";
import { getCourseBrowsePageData } from "@/lib/course-page-data";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    return <PublicLanding />;
  }

  if (session.user.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const workspaceUser = await getWorkspaceUser(session.user);
  const coursePageData = await getCourseBrowsePageData({
    userId: workspaceUser.id,
    role: workspaceUser.role as "STUDENT" | "TEACHER" | "ADMIN",
  });
  const courseHighlights = (
    coursePageData.featuredCourses.length > 0
      ? coursePageData.featuredCourses
      : coursePageData.courses
  )
    .slice(0, 6)
    .map((course) => ({
      id: course._id,
      slug: course.slug,
      title: course.title,
      subject: course.subject,
      level: course.level,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      pricingModel: course.pricingModel,
      price: course.price,
      instructorName: course.instructorName,
      lessonsCount: course.lessonsCount,
      enrollmentCount: course.enrollmentCount,
    }));

  return (
    <>
      <GlobalNoticeModal />
      <WorkspaceShell user={workspaceUser} defaultOpen={defaultOpen}>
        <WorkspaceHome
          role={workspaceUser.role as "STUDENT" | "TEACHER"}
          userId={workspaceUser.id}
          courseHighlights={courseHighlights}
        />
      </WorkspaceShell>
    </>
  );
}
