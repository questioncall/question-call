"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useEffect, useState } from "react";
import { Loader2Icon, QrCodeIcon, SaveIcon, UploadCloudIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ManualPaymentConfig = {
  manualPaymentRecipientName?: string;
  manualPaymentEsewaNumber?: string;
  manualPaymentQrCodeUrl?: string;
};

const FALLBACK_QR = "/QUESTION_HUB_PAYMENT_QR_CODE.jpeg";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function PaymentConfigClient() {
  const [config, setConfig] = useState<ManualPaymentConfig | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [esewaNumber, setEsewaNumber] = useState("");
  const [qrPreview, setQrPreview] = useState(FALLBACK_QR);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/admin/config");
        if (!res.ok) {
          throw new Error("Failed to fetch configuration");
        }

        const data = (await res.json()) as ManualPaymentConfig;
        setConfig(data);
        setRecipientName(data.manualPaymentRecipientName || "Jiban Mijhar");
        setEsewaNumber(data.manualPaymentEsewaNumber || "9819748466");
        setQrPreview(data.manualPaymentQrCodeUrl || FALLBACK_QR);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    void fetchConfig();
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setQrFile(file);

    if (file) {
      setQrPreview(URL.createObjectURL(file));
      return;
    }

    setQrPreview(config?.manualPaymentQrCodeUrl || FALLBACK_QR);
  };

  const handleSave = async () => {
    if (!recipientName.trim() || !esewaNumber.trim()) {
      toast.error("Recipient name and eSewa number are required.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("recipientName", recipientName.trim());
      formData.append("esewaNumber", esewaNumber.trim());

      if (qrFile) {
        formData.append("qrCode", qrFile);
      }

      const res = await fetch("/api/admin/config/manual-payment", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update payment configuration");
      }

      setConfig(data);
      setRecipientName(data.manualPaymentRecipientName || recipientName.trim());
      setEsewaNumber(data.manualPaymentEsewaNumber || esewaNumber.trim());
      setQrPreview(data.manualPaymentQrCodeUrl || FALLBACK_QR);
      setQrFile(null);
      toast.success("Manual payment configuration updated.");
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <QrCodeIcon className="mr-2 inline-block size-6 text-primary" />
          Manual Payment Config
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the name, eSewa number, and QR image shown on the manual payment page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Receiver Details</CardTitle>
          <CardDescription>
            These values are stored in `PlatformConfig` and used directly by the student payment UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Name</label>
              <Input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="e.g. Jiban Mijhar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">eSewa Number</label>
              <Input
                value={esewaNumber}
                onChange={(event) => setEsewaNumber(event.target.value)}
                placeholder="98XXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">QR Code Image</label>
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
                  <UploadCloudIcon className="size-4" />
                  {qrFile ? qrFile.name : "Choose JPG/PNG QR image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  Uploading a new image replaces the currently stored Cloudinary QR code.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
              <p className="mb-3 text-sm font-medium text-foreground">Live preview</p>
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl border border-border bg-white p-3">
                <img
                  src={qrPreview}
                  alt="Manual payment QR preview"
                  className="h-full w-full rounded-lg object-contain"
                />
              </div>
              <div className="mt-4 text-center">
                <p className="font-semibold text-foreground">
                  {recipientName.trim() || "Recipient name"}
                </p>
                <p className="text-sm text-muted-foreground">
                  eSewa: {esewaNumber.trim() || "98XXXXXXXX"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-6">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 size-4" />
            )}
            Save Manual Payment Config
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
