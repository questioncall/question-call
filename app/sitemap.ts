import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static Routes
  const staticRoutes = [
    "",
    "/courses",
    "/leaderboard",
    "/quiz",
    "/legal/terms",
    "/legal/privacy",
    "/legal/refund",
  ].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // 2. Dynamic Routes (Courses)
  let courseRoutes: MetadataRoute.Sitemap = [];
  try {
    await connectToDatabase();
    
    // Fetch only active/public courses for the sitemap
    const activeCourses = await Course.find({ status: "ACTIVE" }, "slug updatedAt").lean();
    
    courseRoutes = activeCourses.map((course: any) => ({
      url: `${SITE_URL}/courses/${course.slug}`,
      lastModified: course.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("Failed to fetch courses for sitemap:", error);
    // Continue with just static routes if DB fails
  }

  return [...staticRoutes, ...courseRoutes];
}
