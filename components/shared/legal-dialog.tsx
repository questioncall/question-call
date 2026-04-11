"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";

import { LegalContent } from "@/components/shared/legal-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LegalResponse = {
  termsOfUseContent: string;
  privacyPolicyContent: string;
  updatedAt?: string | null;
};

type LegalDialogProps = {
  triggerLabel: string;
  triggerClassName?: string;
};

export function LegalDialog({
  triggerLabel,
  triggerClassName,
}: LegalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<LegalResponse | null>(null);

  useEffect(() => {
    if (!isOpen || content) {
      return;
    }

    let active = true;

    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/legal");

        if (!response.ok) {
          throw new Error("Failed to load terms and policies.");
        }

        const data = (await response.json()) as LegalResponse;

        if (active) {
          setContent(data);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load terms and policies.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadContent();

    return () => {
      active = false;
    };
  }, [content, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ||
            "font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
          }
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="h-[90vh] w-[98vw] max-w-none rounded-3xl p-0">
        <div className="flex h-full flex-col overflow-hidden">
          <DialogHeader className="border-b border-border px-6 py-5 text-left sm:px-8">
            <DialogTitle className="text-xl text-foreground">
              Terms and Policies
            </DialogTitle>
            <DialogDescription>
              Review the current legal document used across the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            {isLoading ? (
              <div className="flex h-full min-h-[240px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Loading legal content...
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : content ? (
              <LegalContent
                privacyPolicyContent={content.privacyPolicyContent}
                termsOfUseContent={content.termsOfUseContent}
                updatedAt={content.updatedAt}
              />
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 sm:px-8">
            
            <Button asChild variant="outline">
              <Link href="/legal" target="_blank">
                Open full page
                <ExternalLinkIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
