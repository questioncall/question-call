import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSafeServerSession } from "@/lib/auth";

export default async function AskQuestionPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Ask flow</CardDescription>
          <CardTitle>/ask/question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            This route is the student-only entry point for asking a question. It is set up like a search-first composer so we can later check the database for similar questions before posting a brand-new one.
          </p>
          <form action="/ask/question/results" className="space-y-4" method="get">
            <textarea
              className="min-h-36 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              name="q"
              placeholder="Ask your question in natural language, the way you would type into Google..."
              required
            />
            <div className="flex flex-wrap gap-3">
              <select className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground" name="tier">
                <option value="UNSET">Any answer type</option>
                <option value="ONE">Tier I • Text</option>
                <option value="TWO">Tier II • Photo</option>
                <option value="THREE">Tier III • Video</option>
              </select>
              <select className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground" name="visibility">
                <option value="PUBLIC">Public answer</option>
                <option value="PRIVATE">Private answer</option>
              </select>
              <Button type="submit">Search first, then continue</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Step 1</CardDescription>
            <CardTitle>Write naturally</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            Students should be able to type the full doubt without fitting it into rigid fields first.
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Step 2</CardDescription>
            <CardTitle>Check similar threads</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            The next page can query MongoDB for similar solved questions before creating a duplicate thread.
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Step 3</CardDescription>
            <CardTitle>Post if needed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            If nothing useful matches, we can promote the exact same text into the final question composer.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
