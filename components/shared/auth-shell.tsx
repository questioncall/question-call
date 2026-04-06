import type { ReactNode } from "react";

import { Logo } from "@/components/shared/logo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  portalLabel: string;
  highlights: string[];
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  portalLabel,
  highlights,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-transparent px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-[#281f1614] bg-[#fff8ef]/70 shadow-[0_28px_90px_rgba(90,56,24,0.12)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative flex flex-col justify-between overflow-hidden px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,_rgba(223,106,52,0.18),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(31,118,110,0.14),_transparent_35%)]" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <Logo />
            <span className="eyebrow rounded-full border border-[#281f1614] bg-white/70 px-3 py-2 text-[11px] text-[#6d6257]">
              {portalLabel}
            </span>
          </div>

          <div className="relative z-10 mt-12 max-w-xl">
            <p className="eyebrow text-xs text-[#6d6257]">{eyebrow}</p>
            <h1 className="headline mt-4 text-4xl font-semibold text-[#1e1914] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#5c544c] sm:text-lg">
              {description}
            </p>
          </div>

          <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <div key={item} className="glass-panel rounded-[1.5rem] border border-[#281f1614] p-4">
                <p className="text-sm leading-6 text-[#433b33]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center border-t border-[#281f1614] bg-white/50 px-5 py-8 sm:px-8 lg:border-t-0 lg:border-l lg:px-10">
          <div className="w-full rounded-[1.75rem] border border-[#281f1614] bg-white/85 p-6 shadow-[0_20px_60px_rgba(90,56,24,0.1)] sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
