"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function PageLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setVisible(true);
    });
  }, [pathname, searchParams.toString()]);

  useEffect(() => {
    if (!isPending) {
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isPending]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent">
      <div
        className="h-full bg-emerald-500 transition-all duration-200 ease-out"
        style={{
          width: isPending ? "60%" : "100%",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}