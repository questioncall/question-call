import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getChannelPath } from "@/lib/user-paths";

const existingResults = [
  {
    id: "chn_101",
    title: "Why does current split in a parallel circuit?",
    snippet:
      "Think of each branch as a different road width. Same voltage pushes charge through every road, but the lower-resistance branch carries more current.",
  },
  {
    id: "chn_214",
    title: "Need a faster way to complete the square",
    snippet:
      "Start with the missing-corner visual. Once you see the square, the add-and-subtract move becomes predictable.",
  },
  {
    id: "chn_315",
    title: "Video help for balancing redox reactions",
    snippet:
      "Separate oxidation and reduction first, then balance oxygen, hydrogen, and finally charge in that order.",
  },
] as const;

export default async function AskQuestionResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; visibility?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim();

  if (!query) {
    redirect("/ask/question");
  }

  const loweredQuery = query.toLowerCase();
  const matches = existingResults.filter((item) => {
    return `${item.title} ${item.snippet}`.toLowerCase().includes(loweredQuery);
  });

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Search results</CardDescription>
          <CardTitle>{query}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            This is the second page in the ask flow. Later this will query MongoDB before we create a new question document.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/ask/question">Refine question</Link>
            </Button>
            <Button>Post as a new question</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {(matches.length ? matches : existingResults).map((item) => (
          <Card key={item.id} className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardDescription>Possible related thread</CardDescription>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">{item.snippet}</p>
              <Button asChild variant="outline">
                <Link href={getChannelPath(item.id)}>Open matching channel</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
