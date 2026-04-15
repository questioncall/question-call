import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { getPlatformConfig } from "@/models/PlatformConfig";
import Course from "@/models/Course";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    <div className="p-8">
      <h1 className="text-2xl font-bold">Course Upload</h1>
      <p className="text-neutral-500 mt-2">This feature is under development.</p>
    </div>
  );
}