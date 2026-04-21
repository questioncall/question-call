"use client";

import {
  createContext,
  useContext,
  useOptimistic,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type WorkspaceFilterState = {
  subjects: string[];
  streams: string[];
  levels: string[];
};

type WorkspaceFilterContextValue = {
  filters: WorkspaceFilterState;
  activeFilterCount: number;
  isSyncing: boolean;
  updateFilters: (nextFilters: WorkspaceFilterState) => void;
  clearFilters: () => void;
};

const EMPTY_FILTERS: WorkspaceFilterState = {
  subjects: [],
  streams: [],
  levels: [],
};

const WorkspaceFilterContext = createContext<WorkspaceFilterContextValue | null>(null);

function normalizeFilterValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function readFilterValues(
  searchParams: Pick<URLSearchParams, "get">,
  key: keyof WorkspaceFilterState,
) {
  return normalizeFilterValues(searchParams.get(key)?.split(",") ?? []);
}

function buildFilterState(
  nextState: Partial<WorkspaceFilterState> = {},
): WorkspaceFilterState {
  return {
    subjects: normalizeFilterValues(nextState.subjects ?? []),
    streams: normalizeFilterValues(nextState.streams ?? []),
    levels: normalizeFilterValues(nextState.levels ?? []),
  };
}

function getFilterHref(
  pathname: string,
  searchParams: Pick<URLSearchParams, "toString">,
  filters: WorkspaceFilterState,
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  const writeValues = (key: keyof WorkspaceFilterState, values: string[]) => {
    if (values.length === 0) {
      nextParams.delete(key);
      return;
    }

    nextParams.set(key, values.join(","));
  };

  writeValues("subjects", filters.subjects);
  writeValues("streams", filters.streams);
  writeValues("levels", filters.levels);

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getWorkspaceFiltersFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
) {
  return buildFilterState({
    subjects: readFilterValues(searchParams, "subjects"),
    streams: readFilterValues(searchParams, "streams"),
    levels: readFilterValues(searchParams, "levels"),
  });
}

export function WorkspaceFilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlFilters = getWorkspaceFiltersFromSearchParams(searchParams);
  const [isSyncing, startTransition] = useTransition();
  const [filters, setOptimisticFilters] = useOptimistic(
    urlFilters,
    (_, nextFilters: WorkspaceFilterState) => buildFilterState(nextFilters),
  );

  const updateFilters = (nextFilters: WorkspaceFilterState) => {
    const normalizedFilters = buildFilterState(nextFilters);
    setOptimisticFilters(normalizedFilters);

    const nextHref = getFilterHref(pathname, searchParams, normalizedFilters);
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  };

  const clearFilters = () => {
    updateFilters(EMPTY_FILTERS);
  };

  return (
    <WorkspaceFilterContext.Provider
      value={{
        filters,
        activeFilterCount:
          filters.subjects.length + filters.streams.length + filters.levels.length,
        isSyncing,
        updateFilters,
        clearFilters,
      }}
    >
      {children}
    </WorkspaceFilterContext.Provider>
  );
}

export function useWorkspaceFilters() {
  const context = useContext(WorkspaceFilterContext);

  if (!context) {
    throw new Error("useWorkspaceFilters must be used within WorkspaceFilterProvider.");
  }

  return context;
}
