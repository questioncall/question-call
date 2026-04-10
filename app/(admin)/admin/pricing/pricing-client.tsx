"use client";

import { useEffect, useState } from "react";
import { CreditCardIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <CreditCardIcon className="mr-2 inline-block size-6 text-primary" />
          Subscription Pricing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how much students pay for accessing the platform. Changes take effect immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1-Month Plan</CardTitle>
          <CardDescription>Pricing for the standard monthly subscription.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Original Price (NPR)</label>
            <Input
              type="number"
              value={config.plan1MonthOriginalPrice || 0}
              onChange={(e) => handleChange("plan1MonthOriginalPrice", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">The slashed-out "fake" higher price</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Selling Price (NPR)</label>
            <Input
              type="number"
              value={config.plan1MonthPrice || 0}
              onChange={(e) => handleChange("plan1MonthPrice", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Actual amount charged</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3-Month Plan</CardTitle>
          <CardDescription>Pricing for the quarterly subscription.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Original Price (NPR)</label>
            <Input
              type="number"
              value={config.plan3MonthOriginalPrice || 0}
              onChange={(e) => handleChange("plan3MonthOriginalPrice", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Selling Price (NPR)</label>
            <Input
              type="number"
              value={config.plan3MonthPrice || 0}
              onChange={(e) => handleChange("plan3MonthPrice", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trial Configuration</CardTitle>
          <CardDescription>Settings for new student signups.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Free Trial Duration (Days)</label>
            <Input
              type="number"
              min={0}
              value={config.trialDays || 0}
              onChange={(e) => handleChange("trialDays", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Number of days before payment is required</p>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-6">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 size-4" />
            )}
            Save All Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
