"use client";

import { useEffect, useState } from "react";
import { PlusIcon, RefreshCwIcon, TrashIcon, TicketIcon } from "lucide-react";
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

type CouponData = {
  _id: string;
  code: string;
  type: string;
  scope: string;
  courseId: string | null;
  usageLimit: number | null;
  usedCount: number;
  expiryDate: string | null;
  isActive: boolean;
  createdAt: string;
};

type CourseCouponsManagerProps = {
  courseId: string;
};

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function CourseCouponsManager({ courseId }: CourseCouponsManagerProps) {
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    usageLimit: "",
    expiryDate: "",
  });

  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoupons() {
      try {
        const res = await fetch(`/api/courses/coupons?courseId=${courseId}`);
        if (!res.ok) throw new Error("Failed to load coupons");
        const data = await res.json();
        setCoupons(data.coupons || []);
      } catch (err) {
        toast.error("Could not load coupons.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCoupons();
  }, [courseId]);

  async function createCoupon() {
    if (!newCoupon.code.trim()) return;
    setIsWorking(true);
    try {
      const response = await fetch("/api/courses/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCoupon.code.trim().toUpperCase(),
          scope: "COURSE",
          courseId,
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
          scope: "COURSE",
          courseId,
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
        prev.map((c) =>
          c._id === couponId ? { ...c, isActive: !current } : c
        )
      );
    } catch (error) {
      toast.error("Failed to toggle status.");
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteCoupon() {
    if (!couponToDelete) return;
    setIsWorking(true);
    try {
      await fetch(`/api/courses/coupons/${couponToDelete}`, { method: "DELETE" });
      setCoupons((prev) => prev.filter((c) => c._id !== couponToDelete));
      setCouponToDelete(null);
      toast.success("Coupon deleted.");
    } catch (error) {
      toast.error("Failed to delete.");
    } finally {
      setIsWorking(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading coupons...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Course Coupons</h2>
          <p className="text-sm text-muted-foreground">
            Manage specific coupons for this course.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="size-4 mr-2" />Create coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create course coupon</DialogTitle>
              <DialogDescription>
                Create a new coupon code that grants access to this course.
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
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No coupons created for this course yet.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                        {coupon.code}
                      </code>
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
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete coupon?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The coupon will be permanently removed.
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
    </div>
  );
}
