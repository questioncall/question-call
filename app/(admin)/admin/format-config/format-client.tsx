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
  ratingPointsFor2Star: number;
  ratingPointsFor3Star: number;
  ratingPointsFor4Star: number;
  ratingPointsFor5Star: number;
  scoreDeductionAmount: number;
  bonusPointsFor2Star: number;
  bonusPointsFor3Star: number;
  bonusPointsFor4Star: number;
  bonusPointsFor5Star: number;
  penaltyPointsForLowRating: number;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function getTeacherNetPayout(basePoints: number, bonusPoints: number, commissionPercent: number) {
  const gross = basePoints + bonusPoints;
  const commissionPoints = (gross * commissionPercent) / 100;
  return {
    gross,
    commissionPoints,
    net: Math.max(0, gross - commissionPoints),
  };
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

  const payoutPreview = [
    {
      rating: "2 Star",
      ratingPoints: config.ratingPointsFor2Star || 0,
      bonusPoints: config.bonusPointsFor2Star || 0,
    },
    {
      rating: "3 Star",
      ratingPoints: config.ratingPointsFor3Star || 0,
      bonusPoints: config.bonusPointsFor3Star || 0,
    },
    {
      rating: "4 Star",
      ratingPoints: config.ratingPointsFor4Star || 0,
      bonusPoints: config.bonusPointsFor4Star || 0,
    },
    {
      rating: "5 Star",
      ratingPoints: config.ratingPointsFor5Star || 0,
      bonusPoints: config.bonusPointsFor5Star || 0,
    },
  ].map((entry) => ({
    ...entry,
    ...getTeacherNetPayout(
      entry.ratingPoints,
      entry.bonusPoints,
      config.commissionPercent || 0,
    ),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <SlidersIcon className="mr-2 inline-block size-6 text-primary" />
          Format & Platform Rules
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tune answer deadlines, teacher payouts, commission, and withdrawal rules from one place.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        {/* Answer Durations */}
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle>Teacher Payout Formula</CardTitle>
            <CardDescription>
              Question payouts now follow rating points + bonus points, then platform commission is deducted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Teacher payout formula:
              <span className="ml-1 font-medium text-foreground">
                rating points + rating bonus - platform commission = final credited points
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">2-Star Rating Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.ratingPointsFor2Star || 0}
                  onChange={(e) => handleChange("ratingPointsFor2Star", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">2-Star Bonus Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.bonusPointsFor2Star || 0}
                  onChange={(e) => handleChange("bonusPointsFor2Star", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">3-Star Rating Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.ratingPointsFor3Star || 0}
                  onChange={(e) => handleChange("ratingPointsFor3Star", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">3-Star Bonus Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.bonusPointsFor3Star || 0}
                  onChange={(e) => handleChange("bonusPointsFor3Star", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4-Star Rating Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.ratingPointsFor4Star || 0}
                  onChange={(e) => handleChange("ratingPointsFor4Star", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4-Star Bonus Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.bonusPointsFor4Star || 0}
                  onChange={(e) => handleChange("bonusPointsFor4Star", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">5-Star Rating Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.ratingPointsFor5Star || 0}
                  onChange={(e) => handleChange("ratingPointsFor5Star", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">5-Star Bonus Points</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.bonusPointsFor5Star || 0}
                  onChange={(e) => handleChange("bonusPointsFor5Star", e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3">Rating</th>
                    <th className="px-3 py-3">Rating Points</th>
                    <th className="px-3 py-3">Bonus</th>
                    <th className="px-3 py-3">Commission</th>
                    <th className="px-3 py-3">Final Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutPreview.map((entry) => (
                    <tr key={entry.rating} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-3 font-medium text-foreground">{entry.rating}</td>
                      <td className="px-3 py-3">{entry.ratingPoints}</td>
                      <td className="px-3 py-3">+{entry.bonusPoints}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        -{entry.commissionPoints.toFixed(2)} ({config.commissionPercent || 0}%)
                      </td>
                      <td className="px-3 py-3 font-semibold text-emerald-600">
                        {entry.net.toFixed(2)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Economics & Withdrawals</CardTitle>
            <CardDescription>
              Clear business rules for monetization, deductions, and point-to-cash conversion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Qualification Threshold</label>
                <Input
                  type="number"
                  min={1}
                  value={config.qualificationThreshold || 0}
                  onChange={(e) => handleChange("qualificationThreshold", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Teachers unlock payouts after this many completed answers.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Platform cut from the gross rating payout.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timeout Penalty</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.scoreDeductionAmount || 0}
                  onChange={(e) => handleChange("scoreDeductionAmount", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deducted if the teacher misses the answer deadline.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">1-Star Penalty</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={config.penaltyPointsForLowRating || 0}
                  onChange={(e) => handleChange("penaltyPointsForLowRating", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deducted when the answer gets a 1-star rating and the question resets.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Point to NPR Rate</label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={config.pointToNprRate || 0}
                  onChange={(e) => handleChange("pointToNprRate", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Example: 1 means 1 point = NPR 1. Example: 0.1 means 10 points = NPR 1.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Withdrawal Points</label>
                <Input
                  type="number"
                  min={1}
                  value={config.minWithdrawalPoints || 0}
                  onChange={(e) => handleChange("minWithdrawalPoints", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum balance required before a withdrawal request can be submitted.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium text-foreground">Quick example</p>
                <p className="mt-2 text-muted-foreground">
                  With the current settings, a 4-star answer pays{" "}
                  <span className="font-semibold text-foreground">
                    {payoutPreview.find((entry) => entry.rating === "4 Star")?.net.toFixed(2) || "0.00"} pts
                  </span>{" "}
                  after commission.
                </p>
                <p className="mt-2 text-muted-foreground">
                  A teacher needs{" "}
                  <span className="font-semibold text-foreground">
                    {config.minWithdrawalPoints || 0} pts
                  </span>{" "}
                  before cashout, at{" "}
                  <span className="font-semibold text-foreground">
                    NPR {config.pointToNprRate || 0}
                  </span>{" "}
                  per point.
                </p>
              </div>
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
