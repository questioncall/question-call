import Link from "next/link";

type PagePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: PagePlaceholderProps) {
  return (
    <div className="section-frame rounded-[2rem] p-6 sm:p-8">
      <p className="eyebrow text-xs text-[#6d6257]">{eyebrow}</p>
      <h2 className="headline mt-3 text-3xl font-semibold text-[#1e1914]">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5c544c] sm:text-base">{description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {primaryHref && primaryLabel ? (
          <Link
            className="rounded-2xl bg-[#1e1914] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#352c24]"
            href={primaryHref}
          >
            {primaryLabel}
          </Link>
        ) : null}

        {secondaryHref && secondaryLabel ? (
          <Link
            className="rounded-2xl border border-[#281f1614] bg-white/80 px-4 py-3 text-sm font-semibold text-[#2d251f] transition hover:bg-white"
            href={secondaryHref}
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
