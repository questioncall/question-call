import Link from "next/link";

type TeacherChannelPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherChannelPage({ params }: TeacherChannelPageProps) {
  const { id } = await params;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Private channel</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Channel {id}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        This route will become the messaging workspace between the asker and the
        acceptor, including answer submission and close flow controls.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white" href="/teacher/questions">
          Back to questions
        </Link>
        <Link className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700" href="/teacher/profile">
          Open profile
        </Link>
      </div>
    </section>
  );
}
