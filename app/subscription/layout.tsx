import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Subscription Payments",
  description: "Private subscription checkout and payment confirmation routes.",
});

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
