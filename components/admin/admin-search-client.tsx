"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRightIcon, SearchIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { ADMIN_SEARCH_ENTRIES } from "@/lib/admin-portal";
import { cn } from "@/lib/utils";

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function getEntryScore(entry: (typeof ADMIN_SEARCH_ENTRIES)[number], query: string) {
  if (!query) {
    return entry.group === "Settings" ? 20 : 10;
  }

  const normalizedLabel = normalizeValue(entry.label);
  const normalizedDescription = normalizeValue(entry.description);
  const normalizedGroup = normalizeValue(entry.group);
  const normalizedHref = normalizeValue(entry.href);
  const normalizedKeywords = entry.keywords.map(normalizeValue);

  let score = 0;

  if (normalizedLabel === query) score += 140;
  if (normalizedLabel.startsWith(query)) score += 80;
  if (normalizedLabel.includes(query)) score += 60;
  if (normalizedDescription.includes(query)) score += 35;
  if (normalizedGroup.includes(query)) score += 20;
  if (normalizedHref.includes(query)) score += 15;

  for (const keyword of normalizedKeywords) {
    if (keyword === query) score += 45;
    if (keyword.includes(query)) score += 25;
  }

  return score;
}

export function AdminSearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedQuery = normalizeValue(query);

  const results = useMemo(() => {
    return ADMIN_SEARCH_ENTRIES.map((entry) => ({
      entry,
      score: getEntryScore(entry, normalizedQuery),
    }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
      .map((item) => item.entry);
  }, [normalizedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
  }, [pathname]);

  const openEntry = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) =>
              results.length === 0 ? 0 : (current + 1) % results.length,
            );
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) =>
              results.length === 0
                ? 0
                : (current - 1 + results.length) % results.length,
            );
            return;
          }

          if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            openEntry(results[activeIndex].href);
          }
        }}
        placeholder="Search admin pages, settings, metadata, and tools"
        className="h-11 rounded-2xl border-border/70 bg-background pl-10 pr-4 shadow-sm"
      />

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur">
          <div className="border-b border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Admin Search
            </p>
            <p className="mt-1 text-sm text-foreground">
              {normalizedQuery
                ? `Results for "${query.trim()}"`
                : "Jump to any admin tab, settings section, or control panel."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Searches labels, routes, descriptions, and tab keywords.
            </p>
          </div>

          {results.length > 0 ? (
            <div className="max-h-[22rem] overflow-y-auto p-2">
              {results.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openEntry(entry.href)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    activeIndex === index
                      ? "bg-primary/[0.09]"
                      : "hover:bg-primary/[0.06]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {entry.label}
                      </p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {entry.group}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {entry.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.keywords.slice(0, 3).map((keyword) => (
                        <span
                          key={`${entry.id}-${keyword}`}
                          className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-primary">{entry.href}</p>
                  </div>
                  <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No matching admin destinations found.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
