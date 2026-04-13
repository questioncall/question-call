import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { UploadCourseClient } from "./upload-course-client";
import { getPlatformConfig } from "@/models/PlatformConfig";
import Course from "@/models/Course";
import { connectToDatabase } from "@/lib/mongodb";

export default async function UploadCoursePage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role === "STUDENT") {
    redirect("/courses");
  }

  await connectToDatabase();

  const [existingSubjects, existingLevels, config] = await Promise.all([
    Course.distinct("subject").lean(),
    Course.distinct("level").lean(),
    getPlatformConfig(),
  ]);

  return (
    <UploadCourseClient
      existingSubjects={existingSubjects.filter((s): s is string => typeof s === "string")}
      existingLevels={existingLevels.filter((l): l is string => typeof l === "string")}
      commissionPercent={config.coursePurchaseCommissionPercent}
      userRole={session.user.role}
    />
  );
}