import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LandmarkIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  WalletCardsIcon,
} from "lucide-react";

export default async function WalletPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "TEACHER") {
    redirect("/subscription");
  }

  const walletSummary = [
    {
      label: "Available balance",
      value: "Rs 2,450",
    },
    {
      label: "Qualification",
      value: "8 / 10 answers",
    },
    {
      label: "Pending payout",
      value: "1 request",
    },
  ] as const;

  const payoutHistory = [
    {
      title: "Closed channels credited",
      text: "Teacher earnings will be credited here once the student closes the channel and the rating is locked.",
    },
    {
      title: "Withdrawal tracking",
      text: "Requested payouts, approval state, and bank-transfer status will show here without needing a separate dashboard.",
    },
    {
      title: "Qualification milestone",
      text: "The first ten answered questions still count toward qualification, and this page will surface that progress clearly.",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Teacher wallet</CardDescription>
            <CardTitle>/wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">Earnings center</p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">Track credits, progress, and withdrawals</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    This is the dedicated teacher wallet page you asked for. It now becomes the canonical billing route for teachers instead of sharing the student subscription page.
                  </p>
                </div>
                <WalletCardsIcon className="mt-1 size-5 text-primary" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Qualification progress</span>
                  <span>80%</span>
                </div>
                <Progress value={80} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {walletSummary.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-base font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="gap-2 border-t border-border/70 pt-4">
            <Button size="sm">Request withdrawal</Button>
            <Button size="sm" variant="outline">
              Export earnings history
            </Button>
          </CardFooter>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Live signals</CardDescription>
            <CardTitle>What this page will manage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              <TrendingUpIcon className="mt-1 size-4 text-primary" />
              <span>Qualification progress and earnings unlock state.</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              <LandmarkIcon className="mt-1 size-4 text-primary" />
              <span>Withdrawal destination, request status, and payout approvals.</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              <ReceiptTextIcon className="mt-1 size-4 text-primary" />
              <span>Per-channel earning history once the close-and-rating flow is wired up.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Payout history</CardDescription>
          <CardTitle>Upcoming transaction surface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payoutHistory.map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="mt-2">{item.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
