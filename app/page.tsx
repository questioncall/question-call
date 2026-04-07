import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { GuestHeader } from "@/components/shared/guest-header";
import { WorkspaceHome } from "@/components/shared/workspace-home";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDefaultPath, getSafeServerSession } from "@/lib/auth";
import { getSignInPath, getSignUpPath } from "@/lib/user-paths";

export default async function HomePage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-background">
        <GuestHeader />
        <main>
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    EduAsk workspace
                  </p>
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    A cleaner app shell for asking, answering, and tracking academic help.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                    Sign in to enter the new sidebar-and-header layout. The home page now
                    behaves like a real feed, while profile and settings live on separate routes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href={getSignInPath()}>Sign in</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href={getSignUpPath("STUDENT")}>Register as student</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href={getSignUpPath("TEACHER")}>Register as teacher</Link>
                  </Button>
                </div>
              </div>

              <Card className="border border-border/70 shadow-sm">
                <CardHeader>
                  <CardDescription>What changed</CardDescription>
                  <CardTitle>Current direction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    Home is being treated like the main application feed instead of a placeholder landing page.
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    Public profile routes now use the top-level username path instead of role-specific URLs.
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    The shell is built with shadcn sidebar primitives so the later UI work can grow from a stable base.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (session.user.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <WorkspaceShell user={session.user} defaultOpen={defaultOpen}>
      <WorkspaceHome name={session.user.name} role={session.user.role} />
    </WorkspaceShell>
  );
}
