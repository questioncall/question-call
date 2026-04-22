"use client";
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, type Dispatch, type SetStateAction, useEffect, useState } from "react";
import {
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  QrCodeIcon,
  SaveIcon,
  UploadCloudIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { postMultipartWithProgress } from "@/lib/client-upload";
import {
  CONTACT_SERVICE_EMAIL,
  MAX_CUSTOMER_SERVICE_CONTACTS,
} from "@/lib/constants";

type ManualPaymentConfig = {
  manualPaymentRecipientName?: string;
  manualPaymentEsewaNumber?: string;
  manualPaymentQrCodeUrl?: string;
  customerServicePhoneNumbers?: string[];
  customerServiceEmails?: string[];
};

const FALLBACK_QR = "/QUESTION_HUB_PAYMENT_QR_CODE.jpeg";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function getCustomerServiceSlots(values?: string[]) {
  return Array.from(
    { length: MAX_CUSTOMER_SERVICE_CONTACTS },
    (_, index) => values?.[index] ?? "",
  );
}

export function PaymentConfigClient() {
  const [config, setConfig] = useState<ManualPaymentConfig | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [esewaNumber, setEsewaNumber] = useState("");
  const [qrPreview, setQrPreview] = useState(FALLBACK_QR);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [customerServicePhoneNumbers, setCustomerServicePhoneNumbers] = useState<string[]>(
    () => getCustomerServiceSlots(),
  );
  const [customerServiceEmails, setCustomerServiceEmails] = useState<string[]>(
    () => getCustomerServiceSlots([CONTACT_SERVICE_EMAIL]),
  );
  const [savingCustomerService, setSavingCustomerService] = useState(false);

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
        setCustomerServicePhoneNumbers(
          getCustomerServiceSlots(data.customerServicePhoneNumbers),
        );
        setCustomerServiceEmails(
          getCustomerServiceSlots(
            data.customerServiceEmails?.length
              ? data.customerServiceEmails
              : [CONTACT_SERVICE_EMAIL],
          ),
        );
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
    setUploadProgress(qrFile ? 0 : null);
    try {
      const formData = new FormData();
      formData.append("recipientName", recipientName.trim());
      formData.append("esewaNumber", esewaNumber.trim());

      if (qrFile) {
        formData.append("qrCode", qrFile);
      }

      const data = await postMultipartWithProgress<ManualPaymentConfig>(
        "/api/admin/config/manual-payment",
        formData,
        qrFile
          ? {
              onProgress: ({ percent }) => {
                setUploadProgress(percent);
              },
            }
          : {},
      );

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
      setUploadProgress(null);
    }
  };

  const updateCustomerServiceSlot = (
    index: number,
    value: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) => {
    setter((current) =>
      current.map((entry, currentIndex) =>
        currentIndex === index ? value : entry,
      ),
    );
  };

  const handleSaveCustomerService = async () => {
    setSavingCustomerService(true);

    try {
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerServicePhoneNumbers: customerServicePhoneNumbers,
          customerServiceEmails,
        }),
      });

      const data = (await response.json()) as ManualPaymentConfig & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to update customer service info");
      }

      setConfig(data);
      setCustomerServicePhoneNumbers(
        getCustomerServiceSlots(data.customerServicePhoneNumbers),
      );
      setCustomerServiceEmails(
        getCustomerServiceSlots(
          data.customerServiceEmails?.length
            ? data.customerServiceEmails
            : [CONTACT_SERVICE_EMAIL],
        ),
      );
      toast.success("Customer service details updated for the public footer.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingCustomerService(false);
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
          Payment & Customer Service Config
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update manual payment details and the customer service contacts shown in the public landing footer.
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
                {saving && uploadProgress !== null ? (
                  <UploadProgressBar
                    className="mt-3"
                    label="Uploading QR image"
                    value={uploadProgress}
                  />
                ) : null}
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

      <Card>
        <CardHeader>
          <CardTitle>Customer Service Footer</CardTitle>
          <CardDescription>
            Add up to {MAX_CUSTOMER_SERVICE_CONTACTS} phone numbers and {MAX_CUSTOMER_SERVICE_CONTACTS} emails for the public landing page footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <PhoneIcon className="size-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Phone numbers</p>
                <p className="text-xs text-muted-foreground">
                  These will be shown as tap-to-call chips in the footer.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {customerServicePhoneNumbers.map((phoneNumber, index) => (
                <div key={`customer-phone-${index}`} className="space-y-2">
                  <label className="text-sm font-medium">
                    Number {index + 1}
                  </label>
                  <Input
                    value={phoneNumber}
                    onChange={(event) =>
                      updateCustomerServiceSlot(
                        index,
                        event.target.value,
                        setCustomerServicePhoneNumbers,
                      )
                    }
                    placeholder="e.g. +977 98XXXXXXXX"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <MailIcon className="size-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Highlighted emails</p>
                <p className="text-xs text-muted-foreground">
                  These appear with stronger emphasis in the public footer.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {customerServiceEmails.map((email, index) => (
                <div key={`customer-email-${index}`} className="space-y-2">
                  <label className="text-sm font-medium">
                    Email {index + 1}
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      updateCustomerServiceSlot(
                        index,
                        event.target.value,
                        setCustomerServiceEmails,
                      )
                    }
                    placeholder={
                      index === 0
                        ? CONTACT_SERVICE_EMAIL
                        : "support@example.com"
                    }
                  />
                </div>
              ))}
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              If all email slots are cleared, the default support email will stay available so the footer never becomes empty.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 bg-muted/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            This uses the same cached PlatformConfig record as the rest of the site, so it adds only a very small server-side read on the public homepage.
          </p>
          <Button
            onClick={handleSaveCustomerService}
            disabled={savingCustomerService}
            className="w-full sm:w-auto"
          >
            {savingCustomerService ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 size-4" />
            )}
            Save Customer Service
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
