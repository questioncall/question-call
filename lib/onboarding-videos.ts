import type { PlatformConfigRecord } from "@/models/PlatformConfig";

export type OnboardingVideoRole = "STUDENT" | "TEACHER" | "ADMIN";

export type OnboardingVideoConfig = {
  id?: string;
  role: OnboardingVideoRole;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  isActive: boolean;
};

const ROLE_ORDER: OnboardingVideoRole[] = ["STUDENT", "TEACHER", "ADMIN"];

export function getOnboardingVideos(
  config: Partial<PlatformConfigRecord> | null | undefined,
): OnboardingVideoConfig[] {
  if (!config || !Array.isArray(config.onboardingVideos)) {
    return [];
  }

  return config.onboardingVideos
    .map((entry) => ({
      id: "_id" in entry && entry._id ? String(entry._id) : undefined,
      role: entry.role as OnboardingVideoRole,
      title: entry.title?.trim() || "",
      description: entry.description?.trim() || "",
      videoUrl: entry.videoUrl?.trim() || "",
      thumbnailUrl: entry.thumbnailUrl?.trim() || "",
      isActive: entry.isActive !== false,
    }))
    .filter(
      (entry) =>
        ROLE_ORDER.includes(entry.role) &&
        Boolean(entry.title) &&
        Boolean(entry.videoUrl),
    )
    .sort(
      (left, right) =>
        ROLE_ORDER.indexOf(left.role) - ROLE_ORDER.indexOf(right.role),
    );
}

export function getOnboardingVideoForRole(
  config: Partial<PlatformConfigRecord> | null | undefined,
  role: OnboardingVideoRole,
) {
  return (
    getOnboardingVideos(config).find(
      (entry) => entry.role === role && entry.isActive,
    ) ?? null
  );
}

export function normalizeOnboardingVideos(
  input: unknown,
): OnboardingVideoConfig[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const byRole = new Map<OnboardingVideoRole, OnboardingVideoConfig>();

  for (const rawEntry of input) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const role = "role" in rawEntry ? String(rawEntry.role).toUpperCase() : "";
    if (!ROLE_ORDER.includes(role as OnboardingVideoRole)) {
      continue;
    }

    const title = "title" in rawEntry ? String(rawEntry.title ?? "").trim() : "";
    const videoUrl =
      "videoUrl" in rawEntry ? String(rawEntry.videoUrl ?? "").trim() : "";

    if (!title || !videoUrl) {
      continue;
    }

    byRole.set(role as OnboardingVideoRole, {
      id:
        "_id" in rawEntry && rawEntry._id
          ? String(rawEntry._id)
          : "id" in rawEntry && rawEntry.id
            ? String(rawEntry.id)
            : undefined,
      role: role as OnboardingVideoRole,
      title,
      description:
        "description" in rawEntry
          ? String(rawEntry.description ?? "").trim()
          : "",
      videoUrl,
      thumbnailUrl:
        "thumbnailUrl" in rawEntry
          ? String(rawEntry.thumbnailUrl ?? "").trim()
          : "",
      isActive:
        !("isActive" in rawEntry) || Boolean(rawEntry.isActive),
    });
  }

  return ROLE_ORDER.flatMap((role) => {
    const entry = byRole.get(role);
    return entry ? [entry] : [];
  });
}
