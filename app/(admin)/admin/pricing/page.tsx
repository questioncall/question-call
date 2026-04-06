import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function AdminPricingPage() {
  return (
    <PagePlaceholder
      description="This route is prepared for admin-controlled tier pricing, commission settings, and future payment-related platform configuration."
      eyebrow="Admin Pricing"
      secondaryHref="/admin/tier-config"
      secondaryLabel="Open tier config"
      title="Pricing controls scaffolded"
    />
  );
}
