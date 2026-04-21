/**
 * Single source of truth for the platform display name.
 * Import this everywhere instead of hardcoding "Question Call".
 */
export const APP_NAME = "Question Call";
export const CONTACT_SERVICE_EMAIL = "questioncall24@gmail.com";
export const DEFAULT_SOCIAL_HANDLE_BASE =
  CONTACT_SERVICE_EMAIL.split("@")[0] ?? "questioncall";

export const SOCIAL_HANDLE_META = [
  {
    key: "facebook",
    label: "Facebook",
    badge: "FB",
    badgeClassName: "bg-[#1877F2] text-white",
  },
  {
    key: "instagram",
    label: "Instagram",
    badge: "IG",
    badgeClassName: "bg-[#E4405F] text-white",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    badge: "WA",
    badgeClassName: "bg-[#25D366] text-white",
  },
  {
    key: "youtube",
    label: "YouTube",
    badge: "YT",
    badgeClassName: "bg-[#FF0033] text-white",
  },
  {
    key: "twitter",
    label: "Twitter",
    badge: "X",
    badgeClassName: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    badge: "in",
    badgeClassName: "bg-[#0A66C2] text-white",
  },
  {
    key: "telegram",
    label: "Telegram",
    badge: "TG",
    badgeClassName: "bg-[#229ED9] text-white",
  },
] as const;

export type SocialHandleKey = (typeof SOCIAL_HANDLE_META)[number]["key"];

export const DEFAULT_PLATFORM_SOCIAL_HANDLES: Record<SocialHandleKey, string> = {
  facebook: `@${DEFAULT_SOCIAL_HANDLE_BASE}`,
  instagram: `@${DEFAULT_SOCIAL_HANDLE_BASE}`,
  whatsapp: `@${DEFAULT_SOCIAL_HANDLE_BASE}`,
  youtube: `@${DEFAULT_SOCIAL_HANDLE_BASE}`,
  twitter: `@${DEFAULT_SOCIAL_HANDLE_BASE}`,
  linkedin: `/${DEFAULT_SOCIAL_HANDLE_BASE}`,
  telegram: `@${DEFAULT_SOCIAL_HANDLE_BASE}`,
};

/** Canonical production URL — used in metadata, sitemap, and robots. */
export const SITE_URL = "https://questioncall.com";

/** Default meta description — keep under 160 chars for SERP display. */
export const APP_DESCRIPTION =
  "Question Call connects students with expert teachers for real-time Q&A, guided courses, and interactive quizzes — all in one academic platform.";
