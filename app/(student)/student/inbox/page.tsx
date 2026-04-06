import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function StudentInboxPage() {
  return (
    <PagePlaceholder
      description="Private answers and future read-only channel history will surface here so students can revisit help after a channel is closed."
      eyebrow="Private Answers"
      primaryHref="/student/profile"
      primaryLabel="Open profile"
      secondaryHref="/"
      secondaryLabel="Back to home"
      title="Inbox route is in place"
    />
  );
}
