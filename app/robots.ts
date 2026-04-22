import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/auth/",
        "/payment/",
        "/subscription/",
        "/quiz/",
        "/search/",
        "/settings/",
        "/wallet/",
        "/studio/",
        "/channel/",
        "/message/",
        "/ask/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
