import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { PublicLanding } from "@/components/shared/public-landing";
import { WorkspaceHome } from "@/components/shared/workspace-home";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { GlobalNoticeModal } from "@/components/shared/global-notice-modal";
import { getDefaultPath, getSafeServerSession, getWorkspaceUser } from "@/lib/auth";
import { getCourseBrowsePageData } from "@/lib/course-page-data";
import {
  getCustomerServiceDetails,
  getPlatformConfig,
  getPlatformSocialLinks,
} from "@/models/PlatformConfig";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = createPageMetadata({
  title: "Learn Smarter With Expert Teachers",
  description:
    "Question Call helps students learn through expert answers, guided courses, live sessions, and interactive quizzes in one platform.",
  path: "/",
  keywords: [
    "Question Call",
    "Question Call Nepal",
    "online learning Nepal",
    "student help Nepal",
    "ask expert teachers online",
  ],
});

export default async function HomePage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    const config = await getPlatformConfig();
    return (
      <PublicLanding
        trialDays={config.trialDays}
        customerService={getCustomerServiceDetails(config)}
      />
    );
  }

  if (session.user.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const workspaceUser = await getWorkspaceUser(session.user);
  const socialLinks = getPlatformSocialLinks(await getPlatformConfig());
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
      <WorkspaceShell user={workspaceUser} socialLinks={socialLinks} defaultOpen={defaultOpen}>
        <WorkspaceHome
          role={workspaceUser.role as "STUDENT" | "TEACHER"}
          userId={workspaceUser.id}
          courseHighlights={courseHighlights}
        />
      </WorkspaceShell>
    </>
  );
}
