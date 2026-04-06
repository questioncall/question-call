import { PagePlaceholder } from "@/components/shared/page-placeholder";

type TeacherChannelPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherChannelPage({ params }: TeacherChannelPageProps) {
  const { id } = await params;

  return (
    <PagePlaceholder
      description={`Channel ${id} is reserved for the future private messaging workspace between asker and acceptor, including tier-based answer submission and close flow controls.`}
      eyebrow="Private Channel"
      primaryHref="/teacher/questions"
      primaryLabel="Back to questions"
      secondaryHref="/teacher/profile"
      secondaryLabel="Open profile"
      title={`Channel ${id}`}
    />
  );
}
