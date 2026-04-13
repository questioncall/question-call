"use client";

import { useState } from "react";
import {
  CheckIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type CouponData = {
  _id: string;
  code: string;
  type: string;
  scope: string;
  courseId: string | null;
  courseTitle: string | null;
  usageLimit: number | null;
  usedCount: number;
  expiryDate: string | null;
  isActive: boolean;
  createdAt: string;
};

type AdminCouponsClientProps = {
  coupons: CouponData[];
};

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function AdminCouponsClient({ coupons: initialCoupons }: AdminCouponsClientProps) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [isWorking, setIsWorking] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    scope: "GLOBAL",
    courseId: "",
    usageLimit: "",
    expiryDate: "",
  });

  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  async function createCoupon() {
    if (!newCoupon.code.trim()) return;
    setIsWorking(true);
    try {
      const response = await fetch("/api/courses/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCoupon.code.trim().toUpperCase(),
          scope: newCoupon.scope,
          courseId: newCoupon.scope === "COURSE" && newCoupon.courseId ? newCoupon.courseId : null,
          usageLimit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : null,
          expiryDate: newCoupon.expiryDate || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create");

      setCoupons((prev) => [
        {
          _id: data._id,
          code: newCoupon.code.trim().toUpperCase(),
          type: "FULL_ACCESS",
          scope: newCoupon.scope,
          courseId: newCoupon.scope === "COURSE" ? newCoupon.courseId : null,
          courseTitle: null,
          usageLimit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : null,
          usedCount: 0,
          expiryDate: newCoupon.expiryDate || null,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowCreateDialog(false);
      setNewCoupon({
        code: "",
        scope: "GLOBAL",
        courseId: "",
        usageLimit: "",
        expiryDate: "",
      });
      toast.success("Coupon created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create.");
    } finally {
      setIsWorking(false);
    }
  }

  async function toggleActive(couponId: string, current: boolean) {
    setIsWorking(true);
    try {
      await fetch(`/api/courses/coupons/${couponId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setCoupons((prev) =>
        prev.map((c) => (c._id === couponId ? { ...c, isActive: !current } : c)),
      );
      toast.success(!current ? "Coupon activated." : "Coupon deactivated.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteCoupon(couponId: string) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/courses/coupons/${couponId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      setCoupons((prev) => prev.filter((c) => c._id !== couponId));
      setCouponToDelete(null);
      toast.success("Coupon deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Course coupons</h1>
          <p className="text-sm text-muted-foreground">
            Manage coupons for course access.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="size-4" />Create coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create coupon</DialogTitle>
              <DialogDescription>
                Create a new coupon for course access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. SUMMER2024"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      setNewCoupon((prev) => ({ ...prev, code: generateCode() }))
                    }
                    title="Generate random code"
                  >
                    <RefreshCwIcon className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <select
                  value={newCoupon.scope}
                  onChange={(e) =>
                    setNewCoupon((prev) => ({ ...prev, scope: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="GLOBAL">Global (all courses)</option>
                  <option value="COURSE">Specific course</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Usage limit</Label>
                <Input
                  type="number"
                  value={newCoupon.usageLimit}
                  onChange={(e) =>
                    setNewCoupon((prev) => ({
                      ...prev,
                      usageLimit: e.target.value,
                    }))
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry date</Label>
                <Input
                  type="date"
                  value={newCoupon.expiryDate}
                  onChange={(e) =>
                    setNewCoupon((prev) => ({
                      ...prev,
                      expiryDate: e.target.value,
                    }))
                  }
                />
              </div>
              <Button
                onClick={createCoupon}
                disabled={isWorking || !newCoupon.code.trim()}
                className="w-full"
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
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon._id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                      {coupon.code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {coupon.scope === "GLOBAL" ? (
                      <Badge>Global</Badge>
                    ) : (
                      <Badge variant="outline">
                        {coupon.courseTitle || "Course"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {coupon.usedCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {coupon.expiryDate
                      ? new Date(coupon.expiryDate).toLocaleDateString()
                      : "Never"}
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
                        {coupon.isActive ? (
                          <XIcon className="size-4" />
                        ) : (
                          <CheckIcon className="size-4" />
                        )}
                      </Button>
                      <Dialog
                        open={couponToDelete === coupon._id}
                        onOpenChange={() => setCouponToDelete(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <TrashIcon className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete coupon?</DialogTitle>
                            <DialogDescription>
                              This will permanently delete the coupon. This action cannot
                              be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setCouponToDelete(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteCoupon(coupon._id)}
                              disabled={isWorking}
                              className="flex-1"
                            >
                              Delete
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {coupons.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No coupons yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}