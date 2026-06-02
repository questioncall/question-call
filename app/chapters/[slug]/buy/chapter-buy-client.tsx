"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import type { ChapterDetailData } from "@/lib/chapter-page-data";
import { consumeMobileReturn } from "@/components/payment/mobile-return-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChapterBuyClient({ chapter }: { chapter: ChapterDetailData }) {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState("");
  const [transactorName, setTransactorName] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!transactionId.trim() || !transactorName.trim()) {
      toast.error("Transaction ID and payer name are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("transactionId", transactionId.trim());
      formData.append("transactorName", transactorName.trim());
      if (screenshot) formData.append("screenshot", screenshot);

      const response = await fetch(`/api/chapters/${chapter._id}/purchase/initiate`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit payment.");
      }
      toast.success("Payment submitted for review.");
      // Manual proof awaits admin review → return as "submitted", not "success".
      if (consumeMobileReturn("submitted", "manual")) return;
      router.push(`/chapters/${chapter.slug}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh bg-[#f6f8fb] dark:bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/chapters/${chapter.slug}`}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to chapter
          </Link>
        </Button>

        <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Buy Chapter</h1>
          <p className="mt-2 text-sm text-muted-foreground">{chapter.title}</p>

          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 dark:bg-emerald-950/20">
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-3xl font-bold text-foreground">
              NPR {(chapter.price ?? 0).toLocaleString()}
            </div>
            {chapter.manualPayment.esewaNumber ? (
              <div className="mt-3 text-sm">
                Send to eSewa:{" "}
                <span className="font-semibold">{chapter.manualPayment.esewaNumber}</span>
              </div>
            ) : null}
            {chapter.manualPayment.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={chapter.manualPayment.qrCodeUrl}
                alt="Payment QR"
                className="mt-4 h-48 w-48 rounded-xl object-contain"
              />
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Transaction ID</Label>
              <Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Name on eSewa</Label>
              <Input value={transactorName} onChange={(event) => setTransactorName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment screenshot</Label>
              <Input type="file" accept="image/*" onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)} />
            </div>
          </div>

          <Button
            onClick={submit}
            disabled={isSubmitting}
            className="mt-6 h-12 w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <UploadIcon className="mr-2 size-4" />
            {isSubmitting ? "Submitting..." : "Submit Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
