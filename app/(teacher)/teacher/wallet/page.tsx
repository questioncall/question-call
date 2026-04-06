import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function TeacherWalletPage() {
  return (
    <PagePlaceholder
      description="Wallet balance, credit history, qualification progress, and withdrawal requests will live here once monetization features arrive."
      eyebrow="Teacher Earnings"
      primaryHref="/teacher/profile"
      primaryLabel="Open profile"
      secondaryHref="/"
      secondaryLabel="Back to home"
      title="Wallet route is in place"
    />
  );
}
