"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BellIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const subjectOptions = [
  "IT",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "English",
  "Accountancy",
] as const;

const streamOptions = ["Science", "Management"] as const;

const levelOptions = ["School level", "Plus 2", "Bachelor"] as const;

type FilterState = {
  subjects: string[];
  streams: string[];
  levels: string[];
};

type AuthenticatedHeaderProps = {
  isScrolled: boolean;
  primaryHref: string;
  primaryLabel: string;
  showQuestionFilter?: boolean;
};

export function AuthenticatedHeader({
  isScrolled,
  primaryHref,
  primaryLabel,
  showQuestionFilter = false,
}: AuthenticatedHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const currentFilters = useMemo<FilterState>(() => {
    const readValues = (key: string) =>
      searchParams
        .get(key)
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [];

    return {
      subjects: readValues("subjects"),
      streams: readValues("streams"),
      levels: readValues("levels"),
    };
  }, [searchParams]);

  const [draftFilters, setDraftFilters] = useState<FilterState>(currentFilters);

  const activeFilterCount =
    currentFilters.subjects.length +
    currentFilters.streams.length +
    currentFilters.levels.length;

  const toggleFilter = (group: keyof FilterState, value: string) => {
    setDraftFilters((currentState) => {
      const currentValues = currentState[group];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...currentState,
        [group]: nextValues,
      };
    });
  };

  const applyFilters = () => {
    const nextParams = new URLSearchParams(searchParams.toString());

    const writeValues = (key: string, values: string[]) => {
      if (values.length === 0) {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, values.join(","));
    };

    writeValues("subjects", draftFilters.subjects);
    writeValues("streams", draftFilters.streams);
    writeValues("levels", draftFilters.levels);

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("subjects");
    nextParams.delete("streams");
    nextParams.delete("levels");

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    setDraftFilters({
      subjects: [],
      streams: [],
      levels: [],
    });
    setIsFilterOpen(false);
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-20 transition-all duration-200",
          isScrolled
            ? "border-b border-border/70 bg-background/80 backdrop-blur-md shadow-sm"
            : "border-transparent bg-background"
        )}
      >
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <SidebarTrigger className="shrink-0" />
          <div className="relative hidden max-w-xl flex-1 md:mx-auto md:block">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 pl-10 text-base md:text-sm" placeholder="Search questions, topics, answers, and teachers" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button asChild className="hidden sm:inline-flex" variant={primaryLabel === "Open messages" ? "outline" : "default"}>
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            {showQuestionFilter ? (
              <Button
                className="hidden sm:inline-flex"
                onClick={() => { setDraftFilters(currentFilters); setIsFilterOpen(true); }}
                variant="outline"
              >
                <SlidersHorizontalIcon />
                Filter
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            ) : null}
            <ThemeToggle />
            <Button size="icon" variant="ghost">
              <BellIcon className="size-[18px]" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent className="w-full sm:max-w-lg" side="right">
          <SheetHeader>
            <SheetTitle>Question filters</SheetTitle>
            <SheetDescription>
              Set filters for top questions now, and later we can connect the same choices to real ranking and feed results.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Active filters:
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilterCount > 0 ? (
                  [
                    ...currentFilters.subjects,
                    ...currentFilters.streams,
                    ...currentFilters.levels,
                  ].map((value) => (
                    <span
                      key={value}
                      className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {value}
                    </span>
                  ))
                ) : (
                  <span className="text-xs">No filters applied yet.</span>
                )}
              </div>
            </div>

            <FilterSection
              description="Choose subject-wise areas like IT, biology, chemistry, and more."
              onToggle={(value) => toggleFilter("subjects", value)}
              options={subjectOptions}
              selectedValues={draftFilters.subjects}
              title="Subjects"
            />

            <FilterSection
              description="Pick the broader field or stream for the questions you want to surface first."
              onToggle={(value) => toggleFilter("streams", value)}
              options={streamOptions}
              selectedValues={draftFilters.streams}
              title="Field"
            />

            <FilterSection
              description="Focus the feed by academic level such as school, plus 2, or bachelor."
              onToggle={(value) => toggleFilter("levels", value)}
              options={levelOptions}
              selectedValues={draftFilters.levels}
              title="Level"
            />
          </div>

          <SheetFooter className="border-t border-border/70">
            <Button onClick={clearFilters} variant="ghost">
              Remove current filters
            </Button>
            <Button onClick={applyFilters}>Apply filters</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

type FilterSectionProps = {
  title: string;
  description: string;
  options: readonly string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
};

function FilterSection({
  title,
  description,
  options,
  selectedValues,
  onToggle,
}: FilterSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option);

          return (
            <Button
              key={option}
              onClick={() => onToggle(option)}
              size="sm"
              type="button"
              variant={isSelected ? "default" : "outline"}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </section>
  );
}


