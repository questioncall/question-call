"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenIcon, CheckCircle2Icon, DollarSignIcon, ImageIcon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadFileViaServer } from "@/lib/client-upload";

type PricingModel = "FREE" | "SUBSCRIPTION_INCLUDED" | "PAID";

type FormState = {
  pricingModel: PricingModel;
  price: number | null;
  title: string;
  description: string;
  subject: string;
  level: string;
  thumbnailUrl: string | null;
};

const SUBJECTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Nepali",
  "Economics",
  "Web Development",
  "Mobile Development",
  "Management",
  "Others",
];
const LEVELS = ["Below 10", "11/12", "Bachelor"];

function initialForm(): FormState {
  return {
    pricingModel: "FREE",
    price: null,
    title: "",
    description: "",
    subject: "",
    level: "",
    thumbnailUrl: null,
  };
}

export function CreateChapterModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(initialForm());
    setThumbnailPreviewUrl(null);
    setIsUploadingThumbnail(false);
    setIsProcessing(false);
  }, [open]);

  const canProceed = () => {
    if (step === 1) return form.pricingModel !== "PAID" || (form.price ?? 0) > 0;
    if (step === 2) {
      return form.title.trim() && form.description.trim() && form.subject && form.level;
    }
    return !isUploadingThumbnail;
  };

  const close = () => onOpenChange(false);

  const handleThumbnailSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setThumbnailPreviewUrl(previewUrl);
    setIsUploadingThumbnail(true);
    try {
      const uploaded = await uploadFileViaServer<{ secure_url: string }>(file);
      setForm((prev) => ({ ...prev, thumbnailUrl: uploaded.secure_url }));
      setThumbnailPreviewUrl(uploaded.secure_url);
      toast.success("Thumbnail uploaded.");
    } catch (error) {
      setThumbnailPreviewUrl(null);
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const submit = async () => {
    if (!canProceed()) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.pricingModel === "PAID" ? form.price : null,
          status: "DRAFT",
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create chapter.");
      }
      const chapter = await response.json();
      toast.success("Chapter created.");
      close();
      router.push(`/studio/chapter/${chapter._id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create chapter.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={close} aria-label="Close" />
      <div className="relative z-10 flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={close}>
              <XIcon className="size-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">Create Chapter</h2>
              <p className="text-sm text-muted-foreground">Step {step} of 3</p>
            </div>
          </div>
          <div className="flex gap-2">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : null}
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button onClick={submit} disabled={isProcessing || !canProceed()} className="bg-emerald-600 hover:bg-emerald-700">
                {isProcessing ? "Creating..." : "Create Chapter"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold">How should students access it?</h3>
                <p className="mt-2 text-muted-foreground">Chapters use the same purchase model as courses.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { key: "FREE" as const, label: "Free", icon: BookOpenIcon, color: "emerald" },
                  { key: "SUBSCRIPTION_INCLUDED" as const, label: "Subscription", icon: CheckCircle2Icon, color: "blue" },
                  { key: "PAID" as const, label: "Paid", icon: DollarSignIcon, color: "amber" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, pricingModel: item.key, price: item.key === "PAID" ? prev.price : null }))}
                    className={`rounded-xl border-2 p-5 text-left transition-all ${
                      form.pricingModel === item.key ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-emerald-300"
                    }`}
                  >
                    <item.icon className="size-6 text-emerald-600" />
                    <h4 className="mt-4 text-lg font-bold">{item.label}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.key === "FREE" ? "Open to everyone" : item.key === "SUBSCRIPTION_INCLUDED" ? "For active subscribers" : "One-time purchase"}
                    </p>
                    {form.pricingModel === item.key ? <Badge className="mt-4">Selected</Badge> : null}
                  </button>
                ))}
              </div>
              {form.pricingModel === "PAID" ? (
                <div className="mx-auto max-w-sm space-y-2">
                  <Label>Price (NPR)</Label>
                  <Input
                    type="number"
                    value={form.price ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, price: parseInt(event.target.value, 10) || null }))}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mx-auto max-w-2xl space-y-5">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Chapter details</h3>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={5} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject} onValueChange={(value) => setForm((prev) => ({ ...prev, subject: value }))} options={SUBJECTS.map((subject) => ({ value: subject, label: subject }))} />
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={form.level} onValueChange={(value) => setForm((prev) => ({ ...prev, level: value }))} options={LEVELS.map((level) => ({ value: level, label: level }))} />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mx-auto max-w-2xl space-y-5">
              <div className="text-center">
                <h3 className="text-2xl font-bold">Thumbnail</h3>
                <p className="mt-2 text-sm text-muted-foreground">Optional, but useful in the catalog.</p>
              </div>
              <div className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-border">
                {thumbnailPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailPreviewUrl} alt="Chapter thumbnail" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto size-10 text-muted-foreground" />
                    <Input id="chapter-thumb" type="file" accept="image/*" className="hidden" onChange={handleThumbnailSelect} />
                    <Button asChild variant="outline" className="mt-4">
                      <label htmlFor="chapter-thumb" className="cursor-pointer">
                        <UploadIcon className="mr-2 size-4" />
                        Choose Image
                      </label>
                    </Button>
                  </div>
                )}
              </div>
              {thumbnailPreviewUrl ? (
                <div className="text-center">
                  <Input id="chapter-thumb-replace" type="file" accept="image/*" className="hidden" onChange={handleThumbnailSelect} />
                  <Button asChild variant="outline">
                    <label htmlFor="chapter-thumb-replace" className="cursor-pointer">
                      Replace Image
                    </label>
                  </Button>
                </div>
              ) : null}
              {isUploadingThumbnail ? <p className="text-center text-sm text-muted-foreground">Uploading...</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
