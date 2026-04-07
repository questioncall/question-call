import Link from "next/link";
import { MoveLeftIcon } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Simple Header */}
      <header className="border-b border-border/40 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Logo />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-4">
            <h1 className="text-8xl font-black tracking-tighter text-muted">404</h1>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Page not found
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or never existed in the first place.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2">
              <Link href="/">
                <MoveLeftIcon className="size-4" />
                Back to home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
