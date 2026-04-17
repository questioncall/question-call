"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  DollarSignIcon,
  ImageIcon,
  TagIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { uploadFileViaServer } from "@/lib/client-upload";

type CreateCourseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialData?: {
    _id: string;
    title: string;
    description: string;
    subject: string;
    level: string;
    pricingModel: "FREE" | "SUBSCRIPTION_INCLUDED" | "PAID";
    price: number | null;
    thumbnailUrl: string | null;
    startDate: string | null;
    expectedEndDate: string | null;
  } | null;
};

type CourseFormState = {
  pricingModel: "FREE" | "SUBSCRIPTION_INCLUDED" | "PAID";
  price: number | null;
  title: string;
  description: string;
  subject: string;
  level: string;
  thumbnailUrl: string | null;
  startDate: string;
  expectedEndDate: string;
};

const STEPS = [
  { id: 1, title: "Pricing", icon: CreditCardIcon },
  { id: 2, title: "Details", icon: BookOpenIcon },
  { id: 3, title: "Media", icon: ImageIcon },
  { id: 4, title: "Schedule", icon: CalendarIcon },
  { id: 5, title: "Coupons", icon: TagIcon },
];

const SUBJECTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Nepali",
  "Social Studies",
  "Economics",
  "History",
  "Geography",
  "Accountancy",
  "Business Studies",
  "Computer Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Technology",
  "Data Science",
  "Artificial Intelligence",
  "Machine Learning",
  "Web Development",
  "Mobile Development",
  "UI/UX Design",
  "Digital Marketing",
  "Finance",
  "Management",
  "Law",
  "Philosophy",
  "Psychology",
  "Sociology",
  "Political Science",
  "Statistics",
  "Others",
];

const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Undergraduate",
  "Graduate",
  "Professional",
];

function buildInitialForm(
  initialData: CreateCourseModalProps["initialData"],
): CourseFormState {
  return {
    pricingModel: initialData?.pricingModel || "FREE",
    price: initialData?.price || null,
    title: initialData?.title || "",
    description: initialData?.description || "",
    subject: initialData?.subject || "",
    level: initialData?.level || "",
    thumbnailUrl: initialData?.thumbnailUrl || null,
    startDate: initialData?.startDate || "",
    expectedEndDate: initialData?.expectedEndDate || "",
  };
}

function buildInitialCoupon() {
  return {
    code: "",
    discount: 0,
    discountType: "PERCENT" as "PERCENT" | "FIXED",
    usageLimit: null as number | null,
  };
}

export function CreateCourseModal({
  open,
  onOpenChange,
  mode = "create",
  initialData = null,
}: CreateCourseModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const [form, setForm] = useState<CourseFormState>(() => buildInitialForm(initialData));
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    initialData?.thumbnailUrl || null,
  );

  const [coupon, setCoupon] = useState(buildInitialCoupon);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setIsProcessing(false);
    setIsUploadingThumbnail(false);
    setForm(buildInitialForm(initialData));
    setCoupon(buildInitialCoupon());
    setThumbnailPreviewUrl(initialData?.thumbnailUrl || null);
  }, [initialData, open]);

  useEffect(() => {
    const currentPreviewUrl = thumbnailPreviewUrl;

    return () => {
      if (currentPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [thumbnailPreviewUrl]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return form.pricingModel !== "PAID" || (form.price && form.price > 0);
      case 2:
        return form.title.trim() && form.description.trim() && form.subject.trim() && form.level.trim();
      case 3:
        return !isUploadingThumbnail;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleThumbnailSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const fallbackThumbnailUrl = initialData?.thumbnailUrl || null;
    const localPreviewUrl = URL.createObjectURL(file);

    setThumbnailPreviewUrl(localPreviewUrl);
    setForm((prev) => ({ ...prev, thumbnailUrl: null }));
    setIsUploadingThumbnail(true);

    try {
      const uploadResult = await uploadFileViaServer<{ secure_url: string }>(file);
      setForm((prev) => ({ ...prev, thumbnailUrl: uploadResult.secure_url }));
      setThumbnailPreviewUrl(uploadResult.secure_url);
      toast.success("Thumbnail uploaded.");
    } catch (error) {
      setForm((prev) => ({ ...prev, thumbnailUrl: fallbackThumbnailUrl }));
      setThumbnailPreviewUrl(fallbackThumbnailUrl);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload thumbnail.",
      );
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const clearThumbnail = () => {
    setThumbnailPreviewUrl(null);
    setForm((prev) => ({ ...prev, thumbnailUrl: null }));
  };

  const handleSubmit = async () => {
    if (isUploadingThumbnail) {
      toast.error("Wait for the thumbnail upload to finish.");
      return;
    }

    if (form.pricingModel === "PAID" && (!form.price || form.price <= 0)) {
      toast.error("Please enter a valid price for the paid course.");
      setStep(1);
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.subject.trim() || !form.level.trim()) {
      toast.error("Please fill in all required course details.");
      setStep(2);
      return;
    }

    setIsProcessing(true);
    try {
      const endpoint = mode === "edit" && initialData?._id
        ? `/api/courses/${initialData._id}`
        : "/api/courses";
      const method = mode === "edit" && initialData?._id ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save course");
      }

      const data = await response.json();

      if (coupon.code && form.pricingModel === "PAID") {
        await fetch(`/api/courses/coupons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: data._id,
            code: coupon.code,
            type: "FULL_ACCESS",
            discount: coupon.discount,
            discountType: coupon.discountType,
            usageLimit: coupon.usageLimit,
          }),
        });
      }

      toast.success(mode === "edit" ? "Course updated!" : "Course created!");
      onOpenChange(false);
      router.push(`/courses/${data.slug}/manage`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save course");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setIsProcessing(false);
    setIsUploadingThumbnail(false);
    setForm(buildInitialForm(mode === "edit" ? initialData : null));
    setCoupon(buildInitialCoupon());
    setThumbnailPreviewUrl(mode === "edit" ? initialData?.thumbnailUrl || null : null);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 flex h-[95vh] w-full max-w-6xl flex-col rounded-2xl bg-background shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <XIcon className="size-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">
                {mode === "edit" ? "Edit Course" : "Create New Course"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Step {step} of 5
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next <ArrowRightIcon className="ml-2 size-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? "Saving..." : mode === "edit" ? "Update Course" : "Create Course"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 border-b border-border px-6 py-3 bg-muted/20">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  step === s.id
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : step > s.id
                    ? "bg-emerald-100/50 text-emerald-700/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <s.icon className="size-4" />
                {s.title}
              </button>
              {i < STEPS.length - 1 && (
                <ArrowRightIcon className="size-3 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold">How should students access your course?</h3>
                <p className="mt-2 text-muted-foreground">Choose the pricing model</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <button
                  onClick={() => setForm({ ...form, pricingModel: "FREE", price: null })}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    form.pricingModel === "FREE"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-border hover:border-emerald-300"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-4">
                    <BookOpenIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold">Free</h4>
                  <p className="mt-2 text-sm text-muted-foreground">Anyone can enroll</p>
                  <Badge className="mt-4 bg-emerald-100 text-emerald-700">No revenue</Badge>
                </button>

                <button
                  onClick={() => setForm({ ...form, pricingModel: "SUBSCRIPTION_INCLUDED", price: null })}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    form.pricingModel === "SUBSCRIPTION_INCLUDED"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-border hover:border-blue-300"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 mb-4">
                    <CheckCircle2Icon className="size-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="text-lg font-bold">Subscription</h4>
                  <p className="mt-2 text-sm text-muted-foreground">For active subscribers</p>
                  <Badge className="mt-4 bg-blue-100 text-blue-700">In subscription</Badge>
                </button>

                <button
                  onClick={() => setForm({ ...form, pricingModel: "PAID" })}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    form.pricingModel === "PAID"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "border-border hover:border-amber-300"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 mb-4">
                    <DollarSignIcon className="size-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="text-lg font-bold">Paid</h4>
                  <p className="mt-2 text-sm text-muted-foreground">One-time purchase</p>
                  {form.pricingModel === "PAID" && (
                    <div className="mt-4 space-y-2">
                      <Label>Price (NPR)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={form.price || ""}
                        onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || null })}
                      />
                      <p className="text-xs text-muted-foreground">You get 80% • Platform 20%</p>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Course Details</h3>
                <p className="mt-2 text-muted-foreground">Tell students what they will learn</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Course Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., System Design Cohort"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What will students learn?"
                    rows={5}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select
                      value={form.subject}
                      onValueChange={(val) => setForm({ ...form, subject: val })}
                      options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                      placeholder="Select subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Level *</Label>
                    <Select
                      value={form.level}
                      onValueChange={(val) => setForm({ ...form, level: val })}
                      options={LEVELS.map((l) => ({ value: l, label: l }))}
                      placeholder="Select level"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Course Media</h3>
                <p className="mt-2 text-muted-foreground">Add a thumbnail</p>
              </div>

              <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-border">
                {thumbnailPreviewUrl ? (
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailPreviewUrl} alt="Thumbnail" className="h-full w-full rounded-xl object-cover" />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={clearThumbnail}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <ImageIcon className="size-10 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Upload thumbnail image</p>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="thumb-up"
                      onChange={handleThumbnailSelect}
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="thumb-up" className="cursor-pointer">
                        <UploadIcon className="size-4 mr-2" />Choose File
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              {isUploadingThumbnail && (
                <p className="text-center text-sm text-muted-foreground">
                  Uploading thumbnail...
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Course Schedule</h3>
                <p className="mt-2 text-muted-foreground">Set dates (optional)</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected End Date</Label>
                  <Input
                    type="date"
                    value={form.expectedEndDate}
                    onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Launch Coupon</h3>
                <p className="mt-2 text-muted-foreground">Optional discount for early enrollees</p>
              </div>

              <div className="rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TagIcon className="size-5 text-muted-foreground" />
                  <span className="font-medium">Launch Discount</span>
                  {coupon.code && <Badge className="ml-auto bg-emerald-100 text-emerald-700">Active</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Coupon Code</Label>
                    <Input
                      value={coupon.code}
                      onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., LAUNCH50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input
                      type="number"
                      value={coupon.discount}
                      onChange={(e) => setCoupon({ ...coupon, discount: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={coupon.discountType === "PERCENT"}
                          onChange={() => setCoupon({ ...coupon, discountType: "PERCENT" })}
                        />%
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={coupon.discountType === "FIXED"}
                          onChange={() => setCoupon({ ...coupon, discountType: "FIXED" })}
                        />Fixed
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Usage Limit</Label>
                    <Input
                      type="number"
                      value={coupon.usageLimit || ""}
                      onChange={(e) => setCoupon({ ...coupon, usageLimit: parseInt(e.target.value) || null })}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                {coupon.code && coupon.discount > 0 && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">
                      Use code <span className="font-mono font-bold">{coupon.code}</span>
                      {coupon.discountType === "PERCENT" ? ` for ${coupon.discount}% off` : ` for NPR ${coupon.discount} off`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
