import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import { SITE_URL } from "@/lib/site-url";

type SitemapCourse = {
  slug: string;
  updatedAt?: Date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/quiz`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/auth/signup/student`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/auth/signup/teacher`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

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
