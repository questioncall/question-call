"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, Loader2Icon, PhoneIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";

import {
  CALL_RINGTONE_OPTIONS,
  getCallRingtoneOption,
  type UserCallSettings,
} from "@/lib/call-settings";
import { playCallTone } from "@/lib/call-tone-player";
import { updateProfile } from "@/store/features/user/user-slice";
import { useAppDispatch } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type CallSettingsResponse = {
  error?: string;
  callSettings?: UserCallSettings;
};

type PreviewTarget = "incoming" | "outgoing" | null;

type RingtoneSectionProps = {
  title: string;
  fieldId: string;
  value: UserCallSettings["incomingRingtone"];
  onChange: (value: UserCallSettings["incomingRingtone"]) => void;
  isPreviewing: boolean;
  onPreviewToggle: () => void;
};

function RingtoneSection({
  title,
  fieldId,
  value,
  onChange,
  isPreviewing,
  onPreviewToggle,
}: RingtoneSectionProps) {
  const selectedRingtone = getCallRingtoneOption(value);

  return (
    <div className="grid gap-4 rounded-2xl border border-border/70 bg-background p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="space-y-3">
        <Label htmlFor={fieldId}>{title}</Label>

        <Select
          id={fieldId}
          value={value}
          onValueChange={(nextValue) =>
            onChange(nextValue as UserCallSettings["incomingRingtone"])
          }
          options={CALL_RINGTONE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          className="w-full"
        />

        <p className="text-xs text-muted-foreground">
          {selectedRingtone.description}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={onPreviewToggle}
      >
        <PlayIcon className="size-4" />
        {isPreviewing ? "Stop Preview" : "Preview Tone"}
      </Button>
    </div>
  );
}

export function CallSettingsForm({
  initialSettings,
}: {
  initialSettings: UserCallSettings;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const previewStopRef = useRef<(() => void) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewingTarget, setPreviewingTarget] = useState<PreviewTarget>(null);
  const [silentIncomingCalls, setSilentIncomingCalls] = useState(
    initialSettings.silentIncomingCalls,
  );
  const [incomingRingtone, setIncomingRingtone] = useState<
    UserCallSettings["incomingRingtone"]
  >(initialSettings.incomingRingtone);
  const [outgoingRingtone, setOutgoingRingtone] = useState<
    UserCallSettings["outgoingRingtone"]
  >(initialSettings.outgoingRingtone);

  useEffect(() => {
    return () => {
      previewStopRef.current?.();
      previewStopRef.current = null;
    };
  }, []);

  const stopPreview = () => {
    previewStopRef.current?.();
    previewStopRef.current = null;
    setPreviewingTarget(null);
  };

  const startPreview = (target: Exclude<PreviewTarget, null>) => {
    const ringtone =
      target === "incoming" ? incomingRingtone : outgoingRingtone;

    stopPreview();

    const stopTone = playCallTone(ringtone, {
      volume: target === "incoming" ? 1 : 0.85,
      onEnded: () => {
        previewStopRef.current = null;
        setPreviewingTarget((current) =>
          current === target ? null : current,
        );
      },
    });

    if (!stopTone) {
      toast.error("Unable to preview the selected tone right now.");
      return;
    }

    previewStopRef.current = stopTone;
    setPreviewingTarget(target);
  };

  const handlePreviewToggle = (target: Exclude<PreviewTarget, null>) => {
    if (previewingTarget === target) {
      stopPreview();
      return;
    }

    startPreview(target);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/users/call-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          silentIncomingCalls,
          incomingRingtone,
          outgoingRingtone,
        }),
      });

      const result = (await response.json()) as CallSettingsResponse;

      if (!response.ok || !result.callSettings) {
        throw new Error(result.error || "Failed to save call settings.");
      }

      dispatch(updateProfile({ callSettings: result.callSettings }));
      toast.success("Call settings updated.");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save call settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3">
          <Checkbox
            id="silentIncomingCalls"
            checked={silentIncomingCalls}
            onCheckedChange={(checked) =>
              setSilentIncomingCalls(Boolean(checked))
            }
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="silentIncomingCalls" className="cursor-pointer">
              Silent incoming calls
            </Label>
            <p className="text-xs text-muted-foreground">Show calls without sound.</p>
          </div>
        </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <BellIcon className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Incoming call ringtone
            </p>
          </div>
        </div>

        <RingtoneSection
          title="Incoming ringtone"
          fieldId="incomingRingtone"
          value={incomingRingtone}
          onChange={setIncomingRingtone}
          isPreviewing={previewingTarget === "incoming"}
          onPreviewToggle={() => handlePreviewToggle("incoming")}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <PhoneIcon className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Outgoing call ringback
            </p>
          </div>
        </div>

        <RingtoneSection
          title="Outgoing ringback"
          fieldId="outgoingRingtone"
          value={outgoingRingtone}
          onChange={setOutgoingRingtone}
          isPreviewing={previewingTarget === "outgoing"}
          onPreviewToggle={() => handlePreviewToggle("outgoing")}
        />
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save call settings"
        )}
      </Button>
    </div>
  );
}
