import Link from "next/link";

export default function AdminPricingPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Admin pricing</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Pricing controls</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        Format pricing, commission settings, and payment-related platform configuration
        will be managed here.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700" href="/admin/format-config">
          Open format config
        </Link>
      </div>
    </section>
  );
}
