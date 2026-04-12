"use client";

import { useEffect, useState } from "react";
import { SlidersIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormatConfig = {
  textFormatDuration: number;
  photoFormatDuration: number;
  videoFormatDuration: number;
  maxVideoDurationMinutes: number;
  pointsPerTextAnswer: number;
  pointsPerPhotoAnswer: number;
  pointsPerVideoAnswer: number;
  pointToNprRate: number;
  minWithdrawalPoints: number;
  qualificationThreshold: number;
  commissionPercent: number;
  scoreDeductionAmount: number;
  bonusPointsFor4Star: number;
  bonusPointsFor5Star: number;
  penaltyPointsForLowRating: number;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function FormatClient() {
  const [config, setConfig] = useState<FormatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/admin/config");
        if (!res.ok) throw new Error("Failed to fetch configuration");
        const data = (await res.json()) as FormatConfig;
        setConfig(data);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleChange = (field: keyof FormatConfig, value: string) => {
    setConfig((prev) => (prev ? { ...prev, [field]: Number(value) } : prev));
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
      if (!res.ok) {
        const errorData = data as { error?: string };
        throw new Error(errorData.error || "Failed to update format config");
      }

      toast.success("Format configuration updated successfully! This is now live.");
      setConfig(data as FormatConfig);
    } catch (error) {
      toast.error(getErrorMessage(error));
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <SlidersIcon className="mr-2 inline-block size-6 text-primary" />
          Format & Platform Rules
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tune the core mechanics: answer constraints, teacher economics, and withdrawal points.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Answer Durations */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Format Deadlines</CardTitle>
            <CardDescription>Max minutes a teacher has to submit answer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Format (Minutes)</label>
              <Input
                type="number"
                min={1}
                value={config.textFormatDuration || 0}
                onChange={(e) => handleChange("textFormatDuration", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Photo Format (Minutes)</label>
              <Input
                type="number"
                min={1}
                value={config.photoFormatDuration || 0}
                onChange={(e) => handleChange("photoFormatDuration", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Format (Minutes)</label>
              <Input
                type="number"
                min={1}
                value={config.videoFormatDuration || 0}
                onChange={(e) => handleChange("videoFormatDuration", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Video Upload Length (Minutes)</label>
              <Input
                type="number"
                min={1}
                value={config.maxVideoDurationMinutes || 0}
                onChange={(e) => handleChange("maxVideoDurationMinutes", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Rejects video attachments longer than this before they finish uploading.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Format Points */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Base Points Earned</CardTitle>
            <CardDescription>Base points credited per answered question format.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Answer Points</label>
              <Input
                type="number"
                min={0}
                value={config.pointsPerTextAnswer || 0}
                onChange={(e) => handleChange("pointsPerTextAnswer", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Photo Answer Points</label>
              <Input
                type="number"
                min={0}
                value={config.pointsPerPhotoAnswer || 0}
                onChange={(e) => handleChange("pointsPerPhotoAnswer", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Answer Points</label>
              <Input
                type="number"
                min={0}
                value={config.pointsPerVideoAnswer || 0}
                onChange={(e) => handleChange("pointsPerVideoAnswer", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal rules */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Economics & Withdrawals</CardTitle>
            <CardDescription>Rules defining payouts, thresholds, and deductions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Point to NPR Rate</label>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={config.pointToNprRate || 0}
                onChange={(e) => handleChange("pointToNprRate", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">E.g., 0.1 = 1 Point is 0.1 NPR</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Withdrawal Points</label>
              <Input
                type="number"
                min={1}
                value={config.minWithdrawalPoints || 0}
                onChange={(e) => handleChange("minWithdrawalPoints", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Qualification Threshold</label>
              <Input
                type="number"
                min={1}
                value={config.qualificationThreshold || 0}
                onChange={(e) => handleChange("qualificationThreshold", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Free answers before teacher makes money</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Commission %</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={config.commissionPercent || 0}
                onChange={(e) => handleChange("commissionPercent", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Platform cut</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Timeout Score Penalty</label>
              <Input
                type="number"
                min={0}
                value={config.scoreDeductionAmount || 0}
                onChange={(e) => handleChange("scoreDeductionAmount", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">+ Bonus (4 Star)</label>
              <Input
                type="number"
                min={0}
                value={config.bonusPointsFor4Star || 0}
                onChange={(e) => handleChange("bonusPointsFor4Star", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">+ Bonus (5 Star)</label>
              <Input
                type="number"
                min={0}
                value={config.bonusPointsFor5Star || 0}
                onChange={(e) => handleChange("bonusPointsFor5Star", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">- Penalty (Low Rating)</label>
              <Input
                type="number"
                min={0}
                value={config.penaltyPointsForLowRating || 0}
                onChange={(e) => handleChange("penaltyPointsForLowRating", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Base points reduced by this</p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 pt-6 mt-4">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 size-4" />
              )}
              Save All Rules
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
