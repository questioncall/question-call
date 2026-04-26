"use client";

import { useState } from "react";
import {
  CheckIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  XIcon,
  HistoryIcon,
  SearchIcon,
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
  discountPercentage: number;
  createdAt: string;
};

type CourseData = {
  _id: string;
  title: string;
  slug: string;
};

type RedemptionHistoryData = {
  _id: string;
  couponId: string;
  studentId: string;
  courseId: string | null;
  redeemedAt: string;
};

type AdminCouponsClientProps = {
  coupons: CouponData[];
  courses: CourseData[];
  redemptionHistory: RedemptionHistoryData[];
};

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function AdminCouponsClient({ 
  coupons: initialCoupons, 
  courses,
  redemptionHistory 
}: AdminCouponsClientProps) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [isWorking, setIsWorking] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    scope: "GLOBAL",
    courseId: "",
    courseSearch: "",
    usageLimit: "",
    expiryDate: "",
    discountPercentage: "100",
  });

  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(newCoupon.courseSearch.toLowerCase()) ||
    c.slug.toLowerCase().includes(newCoupon.courseSearch.toLowerCase())
  );

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
          discountPercentage: Number(newCoupon.discountPercentage),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create");

      const courseTitle = newCoupon.scope === "COURSE" && newCoupon.courseId
        ? courses.find(c => c._id === newCoupon.courseId)?.title ?? null
        : null;

      setCoupons((prev) => [
        {
          _id: data._id,
          code: newCoupon.code.trim().toUpperCase(),
          type: "FULL_ACCESS",
          scope: newCoupon.scope,
          courseId: newCoupon.scope === "COURSE" ? newCoupon.courseId : null,
          courseTitle,
          usageLimit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : null,
          usedCount: 0,
          discountPercentage: Number(newCoupon.discountPercentage),
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
        courseSearch: "",
        usageLimit: "",
        expiryDate: "",
        discountPercentage: "100",
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

  const getCourseTitle = (courseId: string | null) => {
    if (!courseId) return "Global";
    return courses.find(c => c._id === courseId)?.title ?? "Unknown Course";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Course coupons</h1>
          <p className="text-sm text-muted-foreground">
            Manage coupons for course access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistoryDialog(true)}>
            <HistoryIcon className="size-4 mr-2" />
            History
          </Button>
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
                      setNewCoupon((prev) => ({ 
                        ...prev, 
                        scope: e.target.value,
                        courseId: e.target.value === "GLOBAL" ? "" : prev.courseId,
                        courseSearch: e.target.value === "GLOBAL" ? "" : prev.courseSearch,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="GLOBAL">Global (all courses)</option>
                    <option value="COURSE">Specific course</option>
                  </select>
                </div>
                {newCoupon.scope === "COURSE" && (
                  <div className="space-y-2">
                    <Label>Select Course</Label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        value={newCoupon.courseSearch}
                        onChange={(e) =>
                          setNewCoupon((prev) => ({
                            ...prev,
                            courseSearch: e.target.value,
                          }))
                        }
                        placeholder="Search courses..."
                        className="pl-9"
                      />
                    </div>
                    {newCoupon.courseSearch && filteredCourses.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                        {filteredCourses.slice(0, 10).map((course) => (
                          <button
                            key={course._id}
                            onClick={() =>
                              setNewCoupon((prev) => ({
                                ...prev,
                                courseId: course._id,
                                courseSearch: course.title,
                              }))
                            }
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            {course.title}
                          </button>
                        ))}
                      </div>
                    )}
                    {newCoupon.courseId && (
                      <p className="text-sm text-muted-foreground">
                        Selected: <span className="font-medium">{getCourseTitle(newCoupon.courseId)}</span>
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Discount Percentage (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newCoupon.discountPercentage}
                    onChange={(e) =>
                      setNewCoupon((prev) => ({
                        ...prev,
                        discountPercentage: e.target.value,
                      }))
                    }
                  />
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
                  disabled={isWorking || !newCoupon.code.trim() || (newCoupon.scope === "COURSE" && !newCoupon.courseId)}
                  className="w-full"
                >
                  Create coupon
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
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
                  <td className="px-4 py-3 text-sm font-medium">
                    {coupon.discountPercentage}%
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

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coupon Redemption History</DialogTitle>
            <DialogDescription>
              View all coupon redemptions
            </DialogDescription>
          </DialogHeader>
          {redemptionHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No redemptions yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Coupon</th>
                  <th className="px-2 py-2 font-medium">Course</th>
                  <th className="px-2 py-2 font-medium">Redeemed At</th>
                </tr>
              </thead>
              <tbody>
                {redemptionHistory.map((record) => {
                  const coupon = coupons.find(c => c._id === record.couponId);
                  return (
                    <tr key={record._id} className="border-b">
                      <td className="px-2 py-2">
                        <code className="text-xs bg-muted px-1 rounded">{coupon?.code || "N/A"}</code>
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {record.courseId ? getCourseTitle(record.courseId) : "Global"}
                      </td>
                      <td className="px-2 py-2 text-sm text-muted-foreground">
                        {new Date(record.redeemedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}