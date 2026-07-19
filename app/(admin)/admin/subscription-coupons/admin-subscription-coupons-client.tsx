"use client";

import { useState } from "react";
import {
  CopyIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlanOption = {
  slug: string;
  name: string;
  price: number;
  durationDays: number;
};

type SubscriptionCouponData = {
  _id: string;
  code: string;
  kind: "FREE_ACCESS" | "PERCENTAGE";
  planSlug: string | null;
  durationDays: number | null;
  discountPercentage: number | null;
  allowedEmails: string[];
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiryDate: string | null;
  campaign: string | null;
  isActive: boolean;
  createdAt: string;
};

type RedemptionEntry = {
  _id: string;
  redeemedAt: string;
  planSlug: string;
  kind: string;
  emailSnapshot: string | null;
  userId: { _id: string; name?: string; email?: string; username?: string } | null;
};

type AdminSubscriptionCouponsClientProps = {
  plans: PlanOption[];
  coupons: SubscriptionCouponData[];
};

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const EMPTY_FORM = {
  code: "",
  kind: "FREE_ACCESS" as "FREE_ACCESS" | "PERCENTAGE",
  planSlug: "",
  durationDays: "",
  discountPercentage: "20",
  emails: "",
  usageLimit: "",
  startsAt: "",
  expiryDate: "",
  campaign: "",
};

function parseEmailsInput(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\n,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function AdminSubscriptionCouponsClient({
  plans,
  coupons: initialCoupons,
}: AdminSubscriptionCouponsClientProps) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [isWorking, setIsWorking] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const [viewingRedemptionsId, setViewingRedemptionsId] = useState<string | null>(null);
  const [redemptionsList, setRedemptionsList] = useState<RedemptionEntry[]>([]);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);

  const parsedEmails = parseEmailsInput(form.emails);
  const invalidEmails = parsedEmails.filter(
    (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  );

  const planName = (slug: string | null) =>
    slug ? plans.find((p) => p.slug === slug)?.name ?? slug : "Any plan";

  function restrictionSummary(coupon: SubscriptionCouponData) {
    const parts: string[] = [];
    if (coupon.allowedEmails.length > 0) {
      parts.push(
        coupon.allowedEmails.length === 1
          ? coupon.allowedEmails[0]
          : `${coupon.allowedEmails.length} emails`,
      );
    }
    if (coupon.usageLimit) {
      parts.push(`first ${coupon.usageLimit}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "Anyone";
  }

  async function createCoupon() {
    if (!form.code.trim()) return;
    setIsWorking(true);
    try {
      const response = await fetch("/api/subscription-coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          kind: form.kind,
          planSlug: form.planSlug || null,
          durationDays: form.durationDays ? Number(form.durationDays) : null,
          discountPercentage:
            form.kind === "PERCENTAGE" ? Number(form.discountPercentage) : null,
          allowedEmails: parsedEmails,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          startsAt: form.startsAt || null,
          expiryDate: form.expiryDate || null,
          campaign: form.campaign || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create");

      setCoupons((prev) => [
        {
          _id: data._id,
          code: form.code.trim().toUpperCase(),
          kind: form.kind,
          planSlug: form.planSlug || null,
          durationDays: form.durationDays ? Number(form.durationDays) : null,
          discountPercentage:
            form.kind === "PERCENTAGE" ? Number(form.discountPercentage) : null,
          allowedEmails: parsedEmails,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          usedCount: 0,
          startsAt: form.startsAt || null,
          expiryDate: form.expiryDate || null,
          campaign: form.campaign || null,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowCreateDialog(false);
      setForm(EMPTY_FORM);
      toast.success("Subscription coupon created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create.");
    } finally {
      setIsWorking(false);
    }
  }

  async function toggleActive(couponId: string, current: boolean) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/subscription-coupons/${couponId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!response.ok) throw new Error();

      setCoupons((prev) =>
        prev.map((c) => (c._id === couponId ? { ...c, isActive: !current } : c)),
      );
    } catch {
      toast.error("Failed to toggle status.");
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteCoupon() {
    if (!couponToDelete) return;
    setIsWorking(true);
    try {
      const response = await fetch(`/api/subscription-coupons/${couponToDelete}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      setCoupons((prev) => prev.filter((c) => c._id !== couponToDelete));
      setCouponToDelete(null);
      toast.success("Coupon deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setIsWorking(false);
    }
  }

  async function viewRedemptions(couponId: string) {
    setViewingRedemptionsId(couponId);
    setIsLoadingRedemptions(true);
    try {
      const res = await fetch(`/api/subscription-coupons/${couponId}/redemptions`);
      if (!res.ok) throw new Error("Failed to fetch redemptions");
      const data = await res.json();
      setRedemptionsList(data.redemptions || []);
    } catch {
      toast.error("Could not load redemptions.");
      setViewingRedemptionsId(null);
    } finally {
      setIsLoadingRedemptions(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success(`Copied ${code}`))
      .catch(() => toast.error("Could not copy code."));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Subscription coupons
          </h1>
          <p className="text-sm text-muted-foreground">
            Promo codes that grant free plan access or discount plan checkout —
            for creator campaigns and targeted offers.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="size-4" />
              Create coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[95vh] w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create subscription coupon</DialogTitle>
              <DialogDescription>
                Free-access coupons activate a plan instantly; discount coupons
                apply at checkout.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. CREATOR2026"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, code: generateCode() }))
                    }
                    title="Generate random code"
                  >
                    <RefreshCwIcon className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Coupon type</Label>
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      kind: e.target.value as "FREE_ACCESS" | "PERCENTAGE",
                      planSlug: "",
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="FREE_ACCESS">Free access (plan + duration)</option>
                  <option value="PERCENTAGE">Discount at checkout (%)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Plan</Label>
                <select
                  value={form.planSlug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, planSlug: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">
                    {form.kind === "FREE_ACCESS" ? "Select a plan…" : "Any paid plan"}
                  </option>
                  {plans.map((plan) => (
                    <option key={plan.slug} value={plan.slug}>
                      {plan.name} (NPR {plan.price} · {plan.durationDays} days)
                    </option>
                  ))}
                </select>
              </div>

              {form.kind === "FREE_ACCESS" ? (
                <div className="space-y-2">
                  <Label>Access duration (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.durationDays}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, durationDays: e.target.value }))
                    }
                    placeholder="Leave empty to use the plan's own duration"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Discount percentage (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={form.discountPercentage}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        discountPercentage: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Restrict to emails (optional)</Label>
                <textarea
                  value={form.emails}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, emails: e.target.value }))
                  }
                  placeholder={"one@example.com, two@example.com\n(comma or newline separated — empty = anyone)"}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
                {parsedEmails.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {parsedEmails.length} email{parsedEmails.length > 1 ? "s" : ""}
                    {invalidEmails.length > 0 && (
                      <span className="text-red-500">
                        {" "}
                        — {invalidEmails.length} invalid: {invalidEmails.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>First N redeemers (optional)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.usageLimit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, usageLimit: e.target.value }))
                  }
                  placeholder="e.g. 100 — leave empty for unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Campaign label (optional)</Label>
                <Input
                  value={form.campaign}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, campaign: e.target.value }))
                  }
                  placeholder='e.g. "YT promo — CreatorName"'
                />
              </div>

              <div className="space-y-2">
                <Label>Starts</Label>
                <Input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Expires</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, expiryDate: e.target.value }))
                  }
                />
              </div>

              <Button
                onClick={createCoupon}
                disabled={
                  isWorking ||
                  !form.code.trim() ||
                  invalidEmails.length > 0 ||
                  (form.kind === "FREE_ACCESS" && !form.planSlug)
                }
                className="w-full sm:col-span-2"
              >
                Create coupon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No subscription coupons yet.
                  </td>
                </tr>
              )}
              {coupons.map((coupon) => (
                <tr key={coupon._id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                        {coupon.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                        onClick={() => copyCode(coupon.code)}
                        title="Copy code"
                      >
                        <CopyIcon className="size-3.5" />
                      </Button>
                    </div>
                    {coupon.campaign && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {coupon.campaign}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.kind === "FREE_ACCESS" ? (
                      <Badge className="bg-emerald-600">
                        Free{coupon.durationDays ? ` ${coupon.durationDays}d` : ""}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{coupon.discountPercentage}% off</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{planName(coupon.planSlug)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {restrictionSummary(coupon)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>
                        {coupon.usedCount}
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " / ∞"}
                      </span>
                      {coupon.usedCount > 0 ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-emerald-600 dark:text-emerald-400"
                          onClick={() => viewRedemptions(coupon._id)}
                        >
                          See all
                        </Button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {coupon.startsAt
                      ? `${new Date(coupon.startsAt).toLocaleDateString()} → `
                      : ""}
                    {coupon.expiryDate
                      ? new Date(coupon.expiryDate).toLocaleDateString()
                      : "Never expires"}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.isActive ? (
                      <Badge className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(coupon._id, coupon.isActive)}
                        disabled={isWorking}
                      >
                        {coupon.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setCouponToDelete(coupon._id)}
                        disabled={isWorking}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!couponToDelete}
        onOpenChange={(open) => !open && setCouponToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete coupon?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The coupon and its redemption history
              will be permanently removed. Already-granted access is not revoked.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCouponToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteCoupon} disabled={isWorking}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingRedemptionsId}
        onOpenChange={(open) => !open && setViewingRedemptionsId(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coupon redemptions</DialogTitle>
            <DialogDescription>Users who redeemed this coupon.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {isLoadingRedemptions ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : redemptionsList.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No redemptions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {redemptionsList.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-start justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {r.userId?.name || "Unknown user"}
                      </div>
                      <div className="text-muted-foreground">
                        {r.userId?.email || r.emailSnapshot || "No email"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.kind === "FREE_ACCESS" ? "Free access" : "Discount"} ·{" "}
                        {r.planSlug}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.redeemedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
