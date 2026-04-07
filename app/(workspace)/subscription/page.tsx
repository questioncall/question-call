import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import {
  CheckCircle2Icon,
  CoinsIcon,
  ReceiptTextIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function SubscriptionPage() {
  const session = await getSafeServerSession();

  if (session?.user?.role === "TEACHER") {
    redirect("/wallet");
  }

  const benefits = [
    "Ask and organize questions from one central feed.",
    "Track public and private answer delivery in one workspace.",
    "Prepare the billing surface for Khalti and eSewa later.",
  ] as const;

  const timeline = [
    {
      label: "Current plan",
      value: "Trial active",
    },
    {
      label: "Renewal window",
      value: "3 days remaining",
    },
    {
      label: "Discount points",
      value: "120 available",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Subscription</CardDescription>
            <CardTitle>Plan and billing overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">Student access plan</p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">Trial progressing smoothly</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    This page is ready to become the payment center for trial status,
                    subscription renewals, and point-based discounts.
                  </p>
                </div>
                <CoinsIcon className="mt-1 size-5 text-primary" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Usage toward renewal</span>
                  <span>68%</span>
                </div>
                <Progress value={68} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {timeline.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-base font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="gap-2 border-t border-border/70 pt-4">
            <Button size="sm">Renew plan</Button>
            <Button size="sm" variant="outline">
              Apply points
            </Button>
          </CardFooter>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Included</CardDescription>
            <CardTitle>What this route will manage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                <CheckCircle2Icon className="mt-1 size-4 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription>Billing history</CardDescription>
          <CardTitle>Upcoming transaction surface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Trial started successfully and will convert to the monthly plan after the grace period.",
            "Points from answering peers will be redeemable before the final payment amount is calculated.",
            "Khalti and eSewa payment confirmations will show up here when the billing flow is connected.",
          ].map((line) => (
            <div key={line} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              <ReceiptTextIcon className="mt-1 size-4 text-primary" />
              <span>{line}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
