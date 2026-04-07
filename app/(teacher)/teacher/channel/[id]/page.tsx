import { redirect } from "next/navigation";

export default async function LegacyTeacherChannelRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/channel/${id}/legacy_thread`);
}
