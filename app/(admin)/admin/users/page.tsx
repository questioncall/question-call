import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function AdminUsersPage() {
  return (
    <PagePlaceholder
      description="User management, suspension controls, and transaction oversight can grow from this protected admin route in later phases."
      eyebrow="User Management"
      primaryHref="/admin/pricing"
      primaryLabel="Back to pricing"
      secondaryHref="/admin/tier-config"
      secondaryLabel="Tier settings"
      title="Users route scaffolded"
    />
  );
}
