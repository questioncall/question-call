"use client";

import { Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SOCIAL_HANDLE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PlatformSocialHandles } from "@/models/PlatformConfig";

export function SocialHandlesHover({
  handles,
}: {
  handles: PlatformSocialHandles;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          aria-label="Show social handles"
          className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/12 hover:text-primary"
          size="icon-sm"
          variant="outline"
        >
          <Share2Icon className="size-4" />
        </Button>
      </HoverCardTrigger>

      <HoverCardContent
        align="end"
        className="w-[calc(100vw-1.5rem)] max-w-[22rem] overflow-hidden rounded-2xl border border-border/80 bg-background/95 p-0 shadow-2xl backdrop-blur-xl"
        side="bottom"
      >
        <div className="border-b border-border/70 bg-muted/25 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Social
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Question Call handles
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          {SOCIAL_HANDLE_META.map((item) => (
            <div
              key={item.label}
              className="group min-w-0 rounded-2xl border border-border/70 bg-background px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.06]"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm transition-transform duration-200 group-hover:scale-105",
                    item.badgeClassName,
                  )}
                >
                  {item.badge}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="text-[10px] leading-3 text-muted-foreground [overflow-wrap:anywhere]">
                    {handles[item.key]}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
