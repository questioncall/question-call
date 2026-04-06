import Link from "next/link";

type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e1914] text-sm font-semibold text-white shadow-[0_18px_45px_rgba(30,25,20,0.18)]">
        EA
      </span>
      {!compact ? (
        <span className="flex flex-col">
          <span className="headline text-lg font-semibold text-[#1e1914]">EduAsk</span>
          <span className="eyebrow text-[11px] text-[#6d6257]">Students • Teachers • Admin</span>
        </span>
      ) : null}
    </Link>
  );
}
