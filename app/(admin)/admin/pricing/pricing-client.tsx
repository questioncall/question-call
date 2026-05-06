"use client";

import { useEffect, useState } from "react";
import { CreditCardIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLAN_FIELDS: Array<{
  slug: string;
  name: string;
  priceField: string | null;
  questionsField: string;
  bonusQuestionsField: string;
  daysField: string | null;
  price: number;
  questions: number;
  bonusQuestions: number;
  days: number;
}> = [
  { slug: "go", name: "GO", priceField: "planGoPrice", questionsField: "planGoMaxQuestions", bonusQuestionsField: "planGoBonusQuestions", daysField: "planGoDays", price: 100, questions: 20, bonusQuestions: 0, days: 30 },
  { slug: "plus", name: "Plus", priceField: "planPlusPrice", questionsField: "planPlusMaxQuestions", bonusQuestionsField: "planPlusBonusQuestions", daysField: "planPlusDays", price: 250, questions: 50, bonusQuestions: 10, days: 60 },
  { slug: "pro", name: "Pro", priceField: "planProPrice", questionsField: "planProMaxQuestions", bonusQuestionsField: "planProBonusQuestions", daysField: "planProDays", price: 500, questions: 100, bonusQuestions: 20, days: 90 },
  { slug: "max", name: "Max", priceField: "planMaxPrice", questionsField: "planMaxMaxQuestions", bonusQuestionsField: "planMaxBonusQuestions", daysField: "planMaxDays", price: 1000, questions: 200, bonusQuestions: 50, days: 120 },
];

export function PricingClient() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/admin/config");
        if (!res.ok) throw new Error("Failed to fetch configuration");
        const data = (await res.json()) as Record<string, unknown>;
        setConfig(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch configuration";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleChange = (field: string, value: string) => {
    setConfig((prev) => prev ? { ...prev, [field]: Number(value) } : null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = (await res.json()) as Record<string, unknown> & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to update pricing config");

      toast.success("Pricing configuration updated successfully! This is now live.");
      setConfig(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update pricing config";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <CreditCardIcon className="mr-2 inline-block size-6 text-primary" />
          Subscription Pricing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage student subscription plans with question limits. Changes take effect immediately.
        </p>
      </div>

      {/* Free Trial */}
      <Card>
        <CardHeader>
          <CardTitle>Free Trial</CardTitle>
          <CardDescription>Automatically granted to new students on signup.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration (Days)</label>
            <Input
              type="number"
              value={(config.trialDays as number) || 3}
              onChange={(e) => handleChange("trialDays", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Questions Included</label>
            <Input
              type="number"
              value={(config.trialMaxQuestions as number) ?? 5}
              onChange={(e) => handleChange("trialMaxQuestions", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Referral System */}
      <Card>
        <CardHeader>
          <CardTitle>Referral System</CardTitle>
          <CardDescription>Reward both sides with bonus questions when someone signs up using a referral code.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="referralEnabled"
                checked={(config.referralEnabled as boolean) ?? true}
                onChange={(e) => setConfig((prev) => prev ? { ...prev, referralEnabled: e.target.checked } : null)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="referralEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable Referrals
              </label>
            </div>
            <p className="text-sm text-muted-foreground">Toggle to instantly turn the referral logic on or off.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">New User Bonus Questions</label>
              <Input
                type="number"
                value={(config.referralBonusQuestions as number) ?? 1}
                onChange={(e) => handleChange("referralBonusQuestions", e.target.value)}
                disabled={!((config.referralEnabled as boolean) ?? true)}
              />
              <p className="text-xs text-muted-foreground mt-1">Questions awarded to the user who signs up with a referral code.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Referrer Bonus Questions</label>
              <Input
                type="number"
                value={(config.referrerBonusQuestions as number) ?? 3}
                onChange={(e) => handleChange("referrerBonusQuestions", e.target.value)}
                disabled={!((config.referralEnabled as boolean) ?? true)}
              />
              <p className="text-xs text-muted-foreground mt-1">Questions awarded to the person who shared the link.</p>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              These values are stored in PlatformConfig and apply immediately everywhere referrals are shown.
            </p>
          </div>
        </CardContent>
      </Card>


      {/* All Plans */}
      {PLAN_FIELDS.map((plan) => (
        <Card key={plan.slug}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>
              Pricing, duration, and question limit for the {plan.name} plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            {plan.priceField ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (NPR)</label>
                <Input
                  type="number"
                  value={((config as Record<string, unknown>)[plan.priceField] as number) || plan.price}
                  onChange={(e) => handleChange(plan.priceField as string, e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (NPR)</label>
                <Input type="number" value={0} disabled />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Questions Included</label>
              <Input
                type="number"
                value={((config as Record<string, unknown>)[plan.questionsField] as number) ?? plan.questions}
                onChange={(e) => handleChange(plan.questionsField, e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Free Bonus Questions</label>
              <Input
                type="number"
                value={((config as Record<string, unknown>)[plan.bonusQuestionsField] as number) ?? plan.bonusQuestions}
                onChange={(e) => handleChange(plan.bonusQuestionsField, e.target.value)}
              />
            </div>
            {plan.daysField && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (Days)</label>
                <Input
                  type="number"
                  value={((config as Record<string, unknown>)[plan.daysField] as number) || plan.days}
                  onChange={(e) => handleChange(plan.daysField as string, e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2Icon className="mr-2 size-4 animate-spin" />
          ) : (
            <SaveIcon className="mr-2 size-4" />
          )}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
