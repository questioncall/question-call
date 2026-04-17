"use client";

import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

/**
 * Detects same-origin link clicks at the document level and shows a
 * progress bar from the moment of click until the new page renders
 * (pathname change). This covers the full compile → render cycle in
 * dev and the full navigation cycle in production.
 */
function PageLoadingBarInner() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  // Slowly advance the bar while loading (never reaches 100)
  const startProgress = useCallback(() => {
    setLoading(true);
    setFinishing(false);
    setProgress(15); // Jump to 15% immediately on click

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        // Slow down as it approaches 90%
        if (prev >= 90) return prev;
        if (prev >= 70) return prev + 0.5;
        if (prev >= 50) return prev + 1;
        return prev + 2;
      });
    }, 150);
  }, []);

  const completeProgress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    setFinishing(true);

    // Hide after the animation finishes
    setTimeout(() => {
      setLoading(false);
      setFinishing(false);
      setProgress(0);
    }, 300);
  }, []);

  // When pathname changes → navigation is done → complete the bar
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      if (loading) {
        completeProgress();
      }
    }
  }, [pathname, loading, completeProgress]);

  // Listen for clicks on <a> links that navigate to a different page
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only handle left clicks without modifier keys
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      // Walk up from the click target to find the nearest <a>
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external links, anchors, mailto, tel, javascript, etc.
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      // Skip links with target="_blank" or download attribute
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      // Check if this is a same-origin link
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        // Only trigger if navigating to a different path
        const currentPath = window.location.pathname + window.location.search;
        const targetPath = url.pathname + url.search;

        if (currentPath !== targetPath) {
          startProgress();
        }
      } catch {
        // Invalid URL, skip
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [startProgress]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!loading && !finishing) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
        style={{
          width: `${progress}%`,
          transition: finishing
            ? "width 200ms ease-out, opacity 200ms ease-out 100ms"
            : "width 300ms ease-out",
          opacity: finishing ? 0 : 1,
        }}
      />
    </div>
  );
}

export function PageLoadingBar() {
  return (
    <Suspense fallback={null}>
      <PageLoadingBarInner />
    </Suspense>
  );
}