"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { postMultipartWithProgress } from "@/lib/client-upload";
import { toast } from "sonner"; // Assuming sonner is used for toasts based on typical shadcn setup
import { useRouter } from "next/navigation";

export function TransactionModal({ planSlug }: { planSlug: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formElement = e.currentTarget;
      const formData = new FormData(formElement);
      const screenshot = formData.get("screenshot");
      const hasScreenshot = screenshot instanceof File && screenshot.size > 0;
      // Append the slug prop to the body to identify their product tier securely
      formData.append("planSlug", planSlug);

      setUploadProgress(hasScreenshot ? 0 : null);

      const data = await postMultipartWithProgress<{ message?: string }>(
        "/api/payments/manual",
        formData,
        hasScreenshot
          ? {
              onProgress: ({ percent }) => {
                setUploadProgress(percent);
              },
            }
          : {},
      );

      setOpen(false);
      toast.success(data.message || "Payment submitted successfully!", {
        description: "Your transaction is pending manual verification.",
      });
      router.push("/subscription/payment/success");

    } catch (error: unknown) {
      toast.error("Submission Failed", {
        description: error instanceof Error ? error.message : "Failed to submit transaction.",
      });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full h-14 rounded-full font-semibold text-base bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-md transition-all mt-8"
        >
          I have paid
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Submit Transaction</DialogTitle>
          <DialogDescription>
            Please provide your transaction details so we can verify your payment manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <label htmlFor="txId" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Transaction ID <span className="text-red-500">*</span>
            </label>
            <input
              id="txId"
              name="transactionId"
              required
              placeholder="e.g. 1AK39BXX"
              className="w-full flex h-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Transactor Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              name="transactorName"
              required
              placeholder="John Doe"
              className="w-full flex h-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="screenshot" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Screenshot (Optional)
            </label>
            <input
              id="screenshot"
              name="screenshot"
              type="file"
              accept="image/*"
              className="w-full flex h-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-500 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {loading && uploadProgress !== null ? (
            <UploadProgressBar
              label="Uploading screenshot"
              value={uploadProgress}
            />
          ) : null}

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-full font-semibold">
            {loading ? "Submitting..." : "Confirm Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
