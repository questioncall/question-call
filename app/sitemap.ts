import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import { SITE_URL } from "@/lib/site-url";

type SitemapCourse = {
  slug: string;
  updatedAt?: Date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/courses", "/legal"].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
    priority: route === "" ? 1 : route === "/courses" ? 0.9 : 0.4,
  }));

  let courseRoutes: MetadataRoute.Sitemap = [];
  try {
    await connectToDatabase();

    const activeCourses = await Course.find({ status: "ACTIVE" }, "slug updatedAt")
      .lean<SitemapCourse[]>();

    courseRoutes = activeCourses
      .filter((course) => typeof course.slug === "string" && course.slug.trim().length > 0)
      .map((course) => ({
      url: `${SITE_URL}/courses/${course.slug}`,
      lastModified: course.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      }));
  } catch (error) {
    console.error("Failed to fetch courses for sitemap:", error);
  }

  return [...staticRoutes, ...courseRoutes];
}
