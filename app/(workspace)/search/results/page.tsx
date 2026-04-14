"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircleIcon,
  BookOpenIcon,
  UserIcon,
  ArrowRightIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SearchResult = {
  questions: { id: string; title: string; body: string; subject?: string; level?: string }[];
  courses: { id: string; title: string; slug: string; subject?: string; thumbnailUrl?: string; pricingModel: string; level?: string }[];
  users: { id: string; name: string; username: string; userImage?: string; role: string }[];
};

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const hasResults = results && (
    results.questions.length > 0 ||
    results.courses.length > 0 ||
    results.users.length > 0
  );

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Search results for</CardDescription>
          <CardTitle className="text-xl">{query}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Searching...
            </div>
          ) : hasResults ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={`/search/results?q=${encodeURIComponent(query)}`}>
                  Refine search
                </Link>
              </Button>
              <Button asChild>
                <Link href="/">
                  Ask a question
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          ) : query.length >= 2 ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground">No results found for &quot;{query}&quot;</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href={`/search/results?q=${encodeURIComponent(query)}`}>
                    Refine search
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/">
                    Ask a question
                    <ArrowRightIcon className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasResults && (
        <div className="grid gap-6">
          {results.questions.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <MessageCircleIcon className="size-5 text-primary" />
                Questions ({results.questions.length})
              </h2>
              <div className="grid gap-3">
                {results.questions.map((q) => (
                  <Link key={q.id} href={`/question/${q.id}`}>
                    <Card className="transition-colors hover:border-primary/50 hover:bg-muted/50">
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-1">{q.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{q.body}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {q.subject && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {q.subject}
                            </span>
                          )}
                          {q.level && (
                            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                              {q.level}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.courses.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <BookOpenIcon className="size-5 text-primary" />
                Courses ({results.courses.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.courses.map((c) => (
                  <Link key={c.id} href={`/courses/${c.slug}`}>
                    <Card className="transition-colors hover:border-primary/50 hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          {c.thumbnailUrl ? (
                            <img
                              src={c.thumbnailUrl}
                              alt=""
                              className="size-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="size-16 rounded-lg bg-muted flex items-center justify-center">
                              <BookOpenIcon className="size-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-medium line-clamp-2">{c.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{c.subject}</p>
                            <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-xs">
                              {c.pricingModel === "FREE" ? "Free" : c.pricingModel === "PAID" ? "Paid" : "Subscription"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.users.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <UserIcon className="size-5 text-primary" />
                Users ({results.users.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.users.map((u) => (
                  <Link key={u.id} href={`/${u.username}`}>
                    <Card className="transition-colors hover:border-primary/50 hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {u.userImage ? (
                            <img
                              src={u.userImage}
                              alt=""
                              className="size-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                              <UserIcon className="size-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-medium line-clamp-1">{u.name}</h3>
                            <p className="text-sm text-muted-foreground">@{u.username}</p>
                            <span className="text-xs text-muted-foreground">{u.role.toLowerCase()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && !hasResults && query.length >= 2 && (
        <Card className="border border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <SearchIcon className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No matches found</h3>
            <p className="mt-1 text-muted-foreground">
              Try different keywords or post your question to get help from teachers.
            </p>
            <Button asChild className="mt-4">
              <Link href="/">
                Ask your question
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}