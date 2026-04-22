import type { Metadata } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { SITE_URL } from "@/lib/site-url";

const DEFAULT_OG_IMAGE = {
  url: "/logo.png",
  width: 676,
  height: 369,
  alt: `${APP_NAME} Platform`,
};

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function formatSeoTitle(title: string) {
  return title === APP_NAME ? APP_NAME : `${title} | ${APP_NAME}`;
}

function buildRobots(index: boolean, follow: boolean): Metadata["robots"] {
  return {
    index,
    follow,
    googleBot: {
      index,
      follow,
      "max-video-preview": index ? -1 : 0,
      "max-image-preview": index ? "large" : "none",
      "max-snippet": index ? -1 : 0,
    },
  };
}

export function absoluteUrl(path = "/") {
  const normalizedPath = normalizePath(path);
  return normalizedPath === "/" ? SITE_URL : `${SITE_URL}${normalizedPath}`;
}

export function truncateDescription(value: string, maxLength = 160) {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 1).trimEnd()}…`;
}

type PageMetadataOptions = {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  keywords?: string[];
  index?: boolean;
  follow?: boolean;
};

export function createPageMetadata({
  title,
  description = APP_DESCRIPTION,
  path,
  image,
  keywords,
  index = true,
  follow = true,
}: PageMetadataOptions): Metadata {
  const resolvedDescription = truncateDescription(description);
  const resolvedTitle = formatSeoTitle(title);
  const images = image
    ? [{ url: image, alt: resolvedTitle }]
    : [DEFAULT_OG_IMAGE];

  return {
    title,
    description: resolvedDescription,
    keywords,
    alternates: path ? { canonical: absoluteUrl(path) } : undefined,
    openGraph: {
      type: "website",
      url: path ? absoluteUrl(path) : undefined,
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: APP_NAME,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: images.map((entry) => entry.url),
    },
    robots: buildRobots(index, follow),
  };
}

export function createNoIndexMetadata(options: {
  title: string;
  description?: string;
}) {
  return createPageMetadata({
    ...options,
    index: false,
    follow: false,
  });
}
