import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function AdminTierConfigPage() {
  return (
    <PagePlaceholder
      description="Tier timing, qualification thresholds, and future score deduction settings will be managed from this admin surface."
      eyebrow="Tier Configuration"
      primaryHref="/admin/pricing"
      primaryLabel="Pricing settings"
      secondaryHref="/admin/users"
      secondaryLabel="Manage users"
      title="Tier config route is ready"
    />
  );
}
