"use client";

import { useMemo, useState } from "react";
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoIcon,
  MailIcon,
  RefreshCwIcon,
  TagIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ReceiptType = "subscription" | "course";
type Gateway = "esewa" | "manual";

const PLANS = [
  { slug: "go",   label: "GO",   amount: "499",  validDays: 30  },
  { slug: "plus", label: "PLUS", amount: "799",  validDays: 60  },
  { slug: "pro",  label: "PRO",  amount: "999",  validDays: 90  },
  { slug: "max",  label: "MAX",  amount: "1499", validDays: 120 },
] as const;

const COURSES = [
  { name: "Photoshop Masterclass", amount: "1499" },
  { name: "Beginner Python",       amount: "999"  },
  { name: "Pro Video Editing",     amount: "2499" },
] as const;

const SAMPLE_EMAIL = "user@example.com";

export default function AdminReceiptsPage() {
  const [type, setType] = useState<ReceiptType>("subscription");
  const [gateway, setGateway] = useState<Gateway>("esewa");
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number]>(PLANS[2]); // PRO
  const [selectedCourse, setSelectedCourse] = useState<typeof COURSES[number]>(COURSES[0]);
  const [previewKey, setPreviewKey] = useState(0);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({
      type,
      gateway,
      email: SAMPLE_EMAIL,
    });
    if (type === "subscription") {
      params.set("planSlug", selectedPlan.slug);
      params.set("amount", selectedPlan.amount);
      params.set("validDays", String(selectedPlan.validDays));
    } else {
      params.set("courseName", selectedCourse.name);
      params.set("amount", selectedCourse.amount);
    }
    params.set("k", String(previewKey)); // cache-bust on refresh
    return `/api/admin/receipts/preview?${params.toString()}`;
  }, [type, gateway, selectedPlan, selectedCourse, previewKey]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Receipt Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview the exact PDFs that are auto-generated and emailed to users for each purchase flow.
        </p>
      </div>

      {/* When receipts are sent */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <InfoIcon className="size-4 text-muted-foreground" />
            When receipts are sent
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <TagIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Subscription</p>
              <p className="text-xs text-muted-foreground">
                Sent when admin approves a manual eSewa payment, or when eSewa auto-verifies a payment for any plan.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  PDF attached
                </Badge>
                <Badge variant="outline" className="text-xs">Push</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <BookOpenIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Course purchase</p>
              <p className="text-xs text-muted-foreground">
                Sent on manual admin approval or successful eSewa course payment. Lifetime access, no expiry on the receipt.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  PDF attached
                </Badge>
                <Badge variant="outline" className="text-xs">Push</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 md:col-span-2">
            <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Withdrawal processed / rejected
              </p>
              <p className="text-xs text-muted-foreground">
                Push notification only — no email, no PDF. Keeps it clean.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type / gateway toggles */}
      <div className="flex flex-wrap gap-3">
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
          <button
            onClick={() => {
              setType("subscription");
              setPreviewKey((k) => k + 1);
            }}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              type === "subscription"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Subscription
          </button>
          <button
            onClick={() => {
              setType("course");
              setPreviewKey((k) => k + 1);
            }}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              type === "course"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Course
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
          <button
            onClick={() => {
              setGateway("esewa");
              setPreviewKey((k) => k + 1);
            }}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              gateway === "esewa"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            eSewa (auto)
          </button>
          <button
            onClick={() => {
              setGateway("manual");
              setPreviewKey((k) => k + 1);
            }}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              gateway === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Manual (admin approved)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Item selector */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {type === "subscription" ? "Select plan" : "Select course"}
          </p>

          {type === "subscription"
            ? PLANS.map((plan) => (
                <button
                  key={plan.slug}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setPreviewKey((k) => k + 1);
                  }}
                  className={[
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    selectedPlan.slug === plan.slug
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {plan.label}
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      NPR {plan.amount}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Valid for {plan.validDays} days
                  </p>
                </button>
              ))
            : COURSES.map((course) => (
                <button
                  key={course.name}
                  onClick={() => {
                    setSelectedCourse(course);
                    setPreviewKey((k) => k + 1);
                  }}
                  className={[
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    selectedCourse.name === course.name
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground line-clamp-1">
                      {course.name}
                    </span>
                    <span className="ml-2 shrink-0 text-sm font-bold text-green-600">
                      NPR {course.amount}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Lifetime access
                  </p>
                </button>
              ))}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => setPreviewKey((k) => k + 1)}
            >
              <RefreshCwIcon className="size-3" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => window.open(previewUrl, "_blank")}
            >
              <ExternalLinkIcon className="size-3" />
              Open tab
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Sample data used</p>
            <p>Email: {SAMPLE_EMAIL}</p>
            <p>Txn ID: TXN-SAMPLE-0001</p>
            <p>Method: {gateway === "manual" ? "Manual (eSewa)" : "eSewa"}</p>
          </div>
        </div>

        {/* PDF embed */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Live PDF preview &mdash;{" "}
                {type === "subscription" ? selectedPlan.label : selectedCourse.name}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                server-generated
              </Badge>
            </div>
            <CardDescription className="text-xs flex items-center gap-1.5">
              <MailIcon className="size-3" />
              This is the exact file attached to the user&apos;s {type} approval email.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              key={previewKey}
              src={previewUrl}
              className="h-[700px] w-full border-0"
              title={`Receipt preview — ${type}`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
