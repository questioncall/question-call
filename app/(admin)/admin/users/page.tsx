import Link from "next/link";

export default function AdminUsersPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">User management</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Users</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        User management, moderation, and transaction oversight can grow from this admin
        route in the later phases.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white" href="/admin/pricing">
          Back to pricing
        </Link>
        <Link className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700" href="/admin/tier-config">
          Tier settings
        </Link>
      </div>
    </section>
  );
}
