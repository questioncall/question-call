"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PlusIcon, Share2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getDefaultPlatformSocialLinks,
  getSocialHandleMeta,
  normalizePlatformSocialLinks,
  SOCIAL_HANDLE_META,
  type PlatformSocialLink,
} from "@/lib/constants";

export function SocialClient() {
  const [socialLinks, setSocialLinks] = useState<PlatformSocialLink[]>(
    getDefaultPlatformSocialLinks(),
  );
  const [loadingSocialConfig, setLoadingSocialConfig] = useState(true);
  const [savingSocialConfig, setSavingSocialConfig] = useState(false);
  const [isAddSocialDialogOpen, setIsAddSocialDialogOpen] = useState(false);
  const [selectedSocialPlatform, setSelectedSocialPlatform] = useState<
    PlatformSocialLink["platform"] | ""
  >("");

  const fetchSocialConfig = async () => {
    try {
      setLoadingSocialConfig(true);
      const response = await fetch("/api/admin/config");

      if (!response.ok) {
        throw new Error("Failed to fetch social handles");
      }

      const data = await response.json();
      setSocialLinks(
        normalizePlatformSocialLinks(data.socialLinks, {
          fallbackToDefault: true,
        }),
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not load social handles.");
    } finally {
      setLoadingSocialConfig(false);
    }
  };

  useEffect(() => {
    fetchSocialConfig();
  }, []);

  const handleSaveSocialConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSocialConfig(true);

    try {
      const normalizedLinks = normalizePlatformSocialLinks(socialLinks);
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialLinks: normalizedLinks }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save social handles");
      }

      setSocialLinks(
        normalizePlatformSocialLinks(data.socialLinks, {
          fallbackToDefault: true,
        }),
      );
      toast.success(
        "Social links updated. Header share cards will refresh instantly.",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save social handles";
      toast.error(message);
    } finally {
      setSavingSocialConfig(false);
    }
  };

  const removeSocialLink = (platform: PlatformSocialLink["platform"]) => {
    setSocialLinks((current) =>
      current.filter((item) => item.platform !== platform),
    );
  };

  const updateSocialLink = (
    platform: PlatformSocialLink["platform"],
    url: string,
  ) => {
    setSocialLinks((current) =>
      current.map((item) =>
        item.platform === platform
          ? {
              ...item,
              url,
            }
          : item,
      ),
    );
  };

  const availableSocialPlatforms = SOCIAL_HANDLE_META.filter(
    (item) => !socialLinks.some((link) => link.platform === item.key),
  );

  const filledSocialLinksCount = socialLinks.filter(
    (item) => item.url.trim().length > 0,
  ).length;
  const remainingSocialSlots = SOCIAL_HANDLE_META.length - socialLinks.length;

  const addSocialLink = (platform: PlatformSocialLink["platform"]) => {
    if (socialLinks.some((item) => item.platform === platform)) {
      return;
    }

    setSocialLinks((current) => [
      ...current,
      {
        platform,
        url: "",
      },
    ]);
  };

  const handleOpenAddSocialDialog = () => {
    if (availableSocialPlatforms.length === 0) {
      return;
    }

    setSelectedSocialPlatform(availableSocialPlatforms[0]?.key ?? "");
    setIsAddSocialDialogOpen(true);
  };

  const handleConfirmAddSocialLink = () => {
    if (!selectedSocialPlatform) {
      return;
    }

    addSocialLink(selectedSocialPlatform);
    setIsAddSocialDialogOpen(false);
    setSelectedSocialPlatform("");
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Social Media</h2>
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          {loadingSocialConfig ? (
            <div className="flex justify-center py-10">
              <Loader2Icon className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSaveSocialConfig} className="space-y-6 p-5 sm:p-6">
              <div className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-amber-500/[0.08] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                      <Share2Icon className="size-3.5" />
                      Social Media Manager
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        Control the public header share cards
                      </h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        This section is dedicated only to social media, so the public
                        link controls stay separate from admin identity and system tools.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 bg-background/80"
                      disabled={availableSocialPlatforms.length === 0}
                      onClick={handleOpenAddSocialDialog}
                    >
                      <PlusIcon className="size-4" />
                      Add Slot
                    </Button>
                    <Button type="submit" disabled={savingSocialConfig}>
                      {savingSocialConfig ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Social Links"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Active Slots
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {socialLinks.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Platforms currently configured in the editor.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Visible Links
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {filledSocialLinksCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Non-empty entries that will appear in the header hover.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Remaining Slots
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {remainingSocialSlots}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Available platforms you can still add to the list.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Available Platforms
                  </p>
                  {availableSocialPlatforms.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableSocialPlatforms.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setSelectedSocialPlatform(item.key);
                            setIsAddSocialDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.06]"
                        >
                          <span
                            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${item.badgeClassName}`}
                          >
                            {item.badge}
                          </span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                      All 10 social slots are already added. Remove one if you want to swap platforms.
                    </div>
                  )}
                </div>
              </div>

              {socialLinks.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border/70 bg-muted/15 p-10 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Share2Icon className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    No social slots added yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Start by choosing a platform from the available slot picker, then
                    add the public URL or handle you want visitors to see.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 gap-2"
                    disabled={availableSocialPlatforms.length === 0}
                    onClick={handleOpenAddSocialDialog}
                  >
                    <PlusIcon className="size-4" />
                    Choose First Slot
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {socialLinks.map((item) => {
                    const meta = getSocialHandleMeta(item.platform);

                    if (!meta) {
                      return null;
                    }

                    return (
                      <div
                        key={item.platform}
                        className="rounded-[24px] border border-border/70 bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl px-2 text-[11px] font-semibold shadow-sm ${meta.badgeClassName}`}
                            >
                              {meta.badge}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {meta.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.url.trim()
                                  ? "Ready to show in the header hover"
                                  : "Add a public URL or handle to make it visible"}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                            onClick={() => removeSocialLink(item.platform)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-border/60 bg-muted/15 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Input
                          </p>
                          <label className="mt-3 block text-sm font-medium text-foreground">
                            URL or handle
                          </label>
                          <Input
                            className="mt-2 bg-background"
                            placeholder={meta.placeholder}
                            value={item.url}
                            onChange={(event) =>
                              updateSocialLink(item.platform, event.target.value)
                            }
                          />
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            Full URLs work best. Short handles, phone numbers, and invite
                            codes are also supported when the platform allows them.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  Removing a slot hides it from the header immediately after the next save.
                  The live workspace header refresh still happens in real time after saving.
                </p>
                <Button type="submit" disabled={savingSocialConfig}>
                  {savingSocialConfig ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Social Links"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isAddSocialDialogOpen}
        onOpenChange={(open) => {
          setIsAddSocialDialogOpen(open);
          if (!open) {
            setSelectedSocialPlatform("");
          }
        }}
      >
        <DialogContent className="max-w-2xl overflow-hidden p-0 sm:max-w-2xl">
          <div className="border-b border-border/70 bg-muted/20 px-5 py-4">
            <DialogHeader>
              <DialogTitle>Choose a social platform</DialogTitle>
              <DialogDescription>
                Pick which slot you want to add to the social media manager. Only
                unused platforms are shown here.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {availableSocialPlatforms.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedSocialPlatform(item.key)}
                  className={`rounded-[22px] border p-4 text-left transition-all ${
                    selectedSocialPlatform === item.key
                      ? "border-primary bg-primary/[0.07] shadow-sm"
                      : "border-border/70 bg-background hover:border-primary/30 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-2 text-[11px] font-semibold shadow-sm ${item.badgeClassName}`}
                    >
                      {item.badge}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {item.label}
                        </p>
                        {selectedSocialPlatform === item.key ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Suggested format: {item.placeholder}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 bg-background px-5 py-4 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedSocialPlatform
                ? `Selected: ${
                    getSocialHandleMeta(selectedSocialPlatform)?.label ?? "Platform"
                  }`
                : "Select a platform to continue."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddSocialDialogOpen(false);
                  setSelectedSocialPlatform("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedSocialPlatform}
                onClick={handleConfirmAddSocialLink}
              >
                Add Selected Slot
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
