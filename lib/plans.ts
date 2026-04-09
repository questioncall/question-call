export type PlanDef = {
  name: string;
  price: number;
  originalPrice: number | null;
  badge: string | null;
  suffix: string;
  slug: string;
  color: string;
  titleClass: string;
  features: string[];
  highlight: boolean;
  tax: number;
  durationDays: number;
};

export const SUBSCRIPTION_PLANS: PlanDef[] = [
  {
    name: "Free",
    price: 0,
    originalPrice: null,
    badge: null,
    suffix: "",
    slug: "free",
    color: "#4154F1",
    titleClass: "text-[#182B49] dark:text-neutral-100",
    features: [
      "3 days free trial",
      "Ask up to 5 questions",
      "Access to public feed",
    ],
    highlight: false,
    tax: 0,
    durationDays: 3,
  },
  {
    name: "1 Month Plan",
    price: 50,
    originalPrice: 100,
    badge: "Most Popular",
    suffix: "/ month",
    slug: "1month",
    color: "#1B7258",
    titleClass: "text-[#114A39] dark:text-neutral-100",
    features: [
      "Ask up to 50 questions",
      "Access to private answers",
      "Earn 2x discount points",
    ],
    highlight: true,
    tax: 0,
    durationDays: 30,
  },
  {
    name: "3 Month Plan",
    price: 140,
    originalPrice: 250,
    badge: "Best Value",
    suffix: "/ 3 months",
    slug: "3month",
    color: "#8A2BE2",
    titleClass: "text-[#4A1578] dark:text-neutral-100",
    features: [
      "Unlimited questions",
      "Priority AI validation",
      "Maximum discount points",
    ],
    highlight: false,
    tax: 0,
    durationDays: 90,
  },
];
