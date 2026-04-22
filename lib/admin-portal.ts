export type AdminPortalEntry = {
  id: string;
  label: string;
  href: string;
  description: string;
  group: string;
  keywords: string[];
};

export const ADMIN_SETTINGS_SECTION_ENTRIES: AdminPortalEntry[] = [
  {
    id: "settings-home",
    label: "Settings Overview",
    href: "/admin/settings",
    description:
      "Start here to see the settings hub, browse admin sections, and jump into the right configuration area.",
    group: "Settings",
    keywords: [
      "settings",
      "overview",
      "admin hub",
      "navigation",
      "search",
      "tabs",
    ],
  },
  {
    id: "settings-profile",
    label: "Admin Profile",
    href: "/admin/settings?section=profile",
    description:
      "Manage the current admin profile, update the password, and create or manage other admin accounts.",
    group: "Settings",
    keywords: [
      "profile",
      "password",
      "security",
      "admin access",
      "create admin",
      "master admin",
      "remove admin",
      "promote admin",
    ],
  },
  {
    id: "settings-social",
    label: "Social Media",
    href: "/admin/settings?section=social",
    description:
      "Control the public social media slots, header share hover icons, and platform profile links.",
    group: "Settings",
    keywords: [
      "social",
      "social media",
      "facebook",
      "instagram",
      "youtube",
      "telegram",
      "tiktok",
      "discord",
      "website",
      "header hover",
      "share links",
    ],
  },
];

export const ADMIN_PORTAL_ROUTE_ENTRIES: AdminPortalEntry[] = [
  {
    id: "pricing",
    label: "Pricing",
    href: "/admin/pricing",
    description:
      "Adjust subscription pricing, package values, and point-to-money platform settings.",
    group: "Platform Config",
    keywords: ["pricing", "plans", "subscription", "rate", "packages"],
  },
  {
    id: "payment-config",
    label: "Payment Config",
    href: "/admin/payment-config",
    description:
      "Manage payment recipient details, QR setup, manual payment copy, and public customer-service footer contacts.",
    group: "Platform Config",
    keywords: [
      "payment",
      "esewa",
      "qr",
      "manual payment",
      "recipient",
      "wallet",
      "customer service",
      "support email",
      "support phone",
      "footer contact",
    ],
  },
  {
    id: "format-config",
    label: "Format Config",
    href: "/admin/format-config",
    description:
      "Update answer format rules, timers, upload limits, and question response behavior.",
    group: "Platform Config",
    keywords: ["format", "duration", "text", "photo", "video", "limits"],
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    description:
      "Review student and teacher accounts, statuses, balances, and moderation controls.",
    group: "People & Operations",
    keywords: ["users", "teachers", "students", "suspend", "account", "profile"],
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    href: "/admin/withdrawals",
    description:
      "Process teacher withdrawal requests, review statuses, and complete or reject payouts.",
    group: "People & Operations",
    keywords: ["withdrawals", "payout", "teacher wallet", "pending", "complete", "reject"],
  },
  {
    id: "transactions",
    label: "Transactions",
    href: "/admin/transactions",
    description:
      "Inspect manual payments, course purchase records, metadata, and approval decisions.",
    group: "Revenue & Finance",
    keywords: ["transactions", "manual payment", "course sale", "refund", "approve"],
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/admin/notifications",
    description:
      "Review admin notifications, unread activity, and operational alerts in one place.",
    group: "Communication",
    keywords: ["notifications", "alerts", "unread", "admin inbox"],
  },
  {
    id: "notices",
    label: "Notices",
    href: "/admin/notices",
    description:
      "Create and manage public notices, platform announcements, and broadcast messaging.",
    group: "Communication",
    keywords: ["notices", "announcements", "broadcast", "message", "global notice"],
  },
  {
    id: "quiz-management",
    label: "Quiz Management",
    href: "/admin/quiz-management",
    description:
      "Control quiz rules, seeding, topic metadata, scoring, and overall quiz administration.",
    group: "Learning & Content",
    keywords: ["quiz", "quiz topics", "quiz rules", "metadata", "ai seeding"],
  },
  {
    id: "ai-keys",
    label: "AI Keys",
    href: "/admin/ai-keys",
    description:
      "Manage AI provider keys, provider failover, rotation, and smart generation settings.",
    group: "Platform Config",
    keywords: ["ai", "api keys", "providers", "rotation", "failover", "llm"],
  },
  {
    id: "courses",
    label: "Courses",
    href: "/admin/courses",
    description:
      "Review courses, pricing models, instructors, approvals, and course performance data.",
    group: "Learning & Content",
    keywords: ["courses", "instructor", "pricing model", "content", "manage courses"],
  },
  {
    id: "coupons",
    label: "Coupons",
    href: "/admin/courses/coupons",
    description:
      "Create and monitor course coupon campaigns, unlock rules, and discount redemptions.",
    group: "Revenue & Finance",
    keywords: ["coupons", "discount", "promo", "unlock", "redeem"],
  },
  {
    id: "live-sessions",
    label: "Live Sessions",
    href: "/admin/live-sessions",
    description:
      "Track scheduled sessions, Zoom-backed live classes, and recording-related admin activity.",
    group: "Learning & Content",
    keywords: ["live sessions", "zoom", "classes", "recording", "schedule"],
  },
  {
    id: "legal",
    label: "Legal",
    href: "/admin/legal",
    description:
      "Update legal copy such as privacy policy and terms that appear across the platform.",
    group: "Platform Config",
    keywords: ["legal", "terms", "privacy", "policy", "content"],
  },
];

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/social", label: "Social Media" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/payment-config", label: "Payment config" },
  { href: "/admin/format-config", label: "Format config" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/quiz-management", label: "Quiz management" },
  { href: "/admin/ai-keys", label: "AI Keys" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/courses/coupons", label: "Coupons" },
  { href: "/admin/live-sessions", label: "Live sessions" },
  { href: "/admin/legal", label: "Legal" },
] as const;

export const ADMIN_SEARCH_ENTRIES = [
  ...ADMIN_SETTINGS_SECTION_ENTRIES,
  ...ADMIN_PORTAL_ROUTE_ENTRIES,
];
