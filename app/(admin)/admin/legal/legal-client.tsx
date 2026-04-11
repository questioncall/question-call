"use client";

import { useEffect, useState } from "react";
import { FileTextIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type LegalConfig = {
  termsOfUseContent: string;
  privacyPolicyContent: string;
};

export function LegalClient() {
  const [config, setConfig] = useState<LegalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/admin/config");
        if (!response.ok) {
          throw new Error("Failed to load legal configuration");
        }

        const data = (await response.json()) as LegalConfig;
        setConfig({
          privacyPolicyContent: data.privacyPolicyContent || "",
          termsOfUseContent: data.termsOfUseContent || "",
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load legal configuration",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchConfig();
  }, []);

  const handleChange = (field: keyof LegalConfig, value: string) => {
    setConfig((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  };

  const handleSave = async () => {
    if (!config) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update legal content");
      }

      setConfig({
        privacyPolicyContent: data.privacyPolicyContent || "",
        termsOfUseContent: data.termsOfUseContent || "",
      });
      toast.success("Legal content updated successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update legal content",
      );
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

  if (!config) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <FileTextIcon className="mr-2 inline-block size-6 text-primary" />
          Legal Content
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the live Terms of Use and Privacy Policy shown in the auth flow
          and the public legal page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Terms of Use</CardTitle>
          <CardDescription>
            This text appears in the shared legal modal and the public legal page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[280px] bg-background text-sm leading-6 md:text-sm"
            onChange={(event) =>
              handleChange("termsOfUseContent", event.target.value)
            }
            value={config.termsOfUseContent}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
          <CardDescription>
            Keep this content clear and user-facing. Changes go live as soon as
            you save them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[280px] bg-background text-sm leading-6 md:text-sm"
            onChange={(event) =>
              handleChange("privacyPolicyContent", event.target.value)
            }
            value={config.privacyPolicyContent}
          />
        </CardContent>
        <CardFooter className="bg-muted/30 pt-6">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 size-4" />
            )}
            Save Legal Content
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
