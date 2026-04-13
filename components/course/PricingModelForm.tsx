"use client";

import { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PricingModelValue = "FREE" | "SUBSCRIPTION_INCLUDED" | "PAID";

type PricingModelFormProps = {
  pricingModel: PricingModelValue;
  price: number | null;
  commissionPercent: number;
  onChange: (value: { pricingModel: PricingModelValue; price: number | null }) => void;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function PricingModelForm({
  pricingModel,
  price,
  commissionPercent,
  onChange,
}: PricingModelFormProps) {
  const safePrice = Number(price || 0);
  const commissionAmount = roundCurrency(
    safePrice * (commissionPercent / 100),
  );
  const teacherAmount = roundCurrency(safePrice - commissionAmount);

  const handlePricingModelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPricingModel = event.target.value as PricingModelValue;
    onChange({
      pricingModel: nextPricingModel,
      price: nextPricingModel === "PAID" ? price ?? 0 : null,
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Pricing model</h3>
        <p className="text-xs text-muted-foreground">
          Choose how students will unlock this course.
        </p>
      </div>

      <div className="grid gap-3">
        {[
          {
            value: "FREE" as const,
            label: "Free",
            description: "Any authenticated user can enroll without payment.",
          },
          {
            value: "SUBSCRIPTION_INCLUDED" as const,
            label: "Subscription",
            description: "Only subscribers or coupon holders can unlock the course.",
          },
          {
            value: "PAID" as const,
            label: "Paid",
            description: "Students pay per course with manual eSewa review.",
          },
        ].map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/20 p-4"
          >
            <input
              type="radio"
              name="pricingModel"
              value={option.value}
              checked={pricingModel === option.value}
              onChange={handlePricingModelChange}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
          </label>
        ))}
      </div>

      {pricingModel === "PAID" ? (
        <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
          <div className="space-y-2">
            <Label htmlFor="course-price">Course Price (NPR)</Label>
            <Input
              id="course-price"
              type="number"
              min={1}
              value={price ?? ""}
              onChange={(event) =>
                onChange({
                  pricingModel,
                  price: event.target.value ? Number(event.target.value) : 0,
                })
              }
            />
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Platform commission ({commissionPercent}%)</span>
              <span>NPR {commissionAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-medium text-foreground">
              <span>You receive per sale</span>
              <span>NPR {teacherAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
