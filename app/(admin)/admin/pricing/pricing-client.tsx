"use client";

import { useEffect, useState } from "react";
import { CreditCardIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLAN_FIELDS: Array<{
  slug: string;
  name: string;
  priceField: string | null;
  questionsField: string;
  price: number;
  questions: number;
}> = [
  { slug: "free", name: "Free Trial", priceField: null, questionsField: "trialMaxQuestions", price: 0, questions: 5 },
  { slug: "go", name: "GO", priceField: "planGoPrice", questionsField: "planGoMaxQuestions", price: 100, questions: 20 },
  { slug: "plus", name: "Plus", priceField: "planPlusPrice", questionsField: "planPlusMaxQuestions", price: 250, questions: 50 },
  { slug: "pro", name: "Pro", priceField: "planProPrice", questionsField: "planProMaxQuestions", price: 500, questions: 100 },
  { slug: "max", name: "Max", priceField: "planMaxPrice", questionsField: "planMaxMaxQuestions", price: 1000, questions: 200 },
];

export function PricingClient() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/admin/config");
        if (!res.ok) throw new Error("Failed to fetch configuration");
        const data = await res.json();
        setConfig(data);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleChange = (field: string, value: string) => {
    setConfig((prev: any) => ({ ...prev, [field]: Number(value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update pricing config");

      toast.success("Pricing configuration updated successfully! This is now live.");
      setConfig(data);
    } catch (err: any) {
      toast.error(err.message);
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
              value={config.trialDays || 3}
              onChange={(e) => handleChange("trialDays", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Questions Included</label>
            <Input
              type="number"
              value={config.trialMaxQuestions ?? 5}
              onChange={(e) => handleChange("trialMaxQuestions", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Referral System */}
      <Card>
        <CardHeader>
          <CardTitle>Referral System</CardTitle>
          <CardDescription>Reward users with bonus questions when they invite others.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="referralEnabled"
                checked={config.referralEnabled ?? true}
                onChange={(e) => setConfig((prev: any) => ({ ...prev, referralEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="referralEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable Referrals
              </label>
            </div>
            <p className="text-sm text-muted-foreground">Toggle to instantly turn the referral logic on or off.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bonus Questions</label>
            <Input
              type="number"
              value={config.referralBonusQuestions ?? 10}
              onChange={(e) => handleChange("referralBonusQuestions", e.target.value)}
              disabled={!(config.referralEnabled ?? true)}
            />
            <p className="text-xs text-muted-foreground mt-1">Questions awarded to both the referrer and the new referee.</p>
          </div>
        </CardContent>
      </Card>

      {/* All Plans */}
      {PLAN_FIELDS.map((plan) => (
        <Card key={plan.slug}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>
              {plan.slug === "free" 
                ? "Free trial on signup - no payment required"
                : `Pricing and question limit for the ${plan.name} plan.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {plan.priceField ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (NPR)</label>
                <Input
                  type="number"
                  value={config[plan.priceField] || plan.price}
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
                value={config[plan.questionsField] ?? plan.questions}
                onChange={(e) => handleChange(plan.questionsField, e.target.value)}
              />
            </div>
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
