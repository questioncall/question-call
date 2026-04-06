import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function TeacherQuestionsPage() {
  return (
    <PagePlaceholder
      description="The teacher question feed will appear here with accept actions, tier requirements, and reset prioritization in the upcoming question system phase."
      eyebrow="Question Queue"
      primaryHref="/teacher/profile"
      primaryLabel="Open profile"
      secondaryHref="/"
      secondaryLabel="Back to home"
      title="Teacher questions route scaffolded"
    />
  );
}
