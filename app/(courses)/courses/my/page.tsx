import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { getMyCoursesPageData } from "@/lib/course-page-data";
import { createNoIndexMetadata } from "@/lib/seo";
import { MyCoursesClient } from "./my-courses-client";

export const metadata = createNoIndexMetadata({
  title: "My Courses",
  description: "Track your enrolled courses and continue learning.",
});

export default async function MyCoursesPage() {
  const session = await getSafeServerSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const courses = await getMyCoursesPageData(session.user.id);

  return (
    <MyCoursesClient
      userName={session.user.name ?? "Student"}
      courses={courses}
    />
  );
}
