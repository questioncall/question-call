import Link from "next/link";

export default function AdminFormatConfigPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Format configuration</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Format config</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        Format timing, qualification thresholds, and score deduction settings will be
        managed from this admin page.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white" href="/admin/pricing">
          Pricing settings
        </Link>
        <Link className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700" href="/admin/users">
          Manage users
        </Link>
      </div>
    </section>
  );
}
