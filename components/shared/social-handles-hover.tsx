"use client";

import { Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  getSocialHandleMeta,
  getSocialLinkHref,
  type PlatformSocialLink,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SocialHandlesHover({
  links,
}: {
  links: PlatformSocialLink[];
}) {
  const activeLinks = links.filter((item) => item.url.trim().length > 0);

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

        {activeLinks.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No social links have been added yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {activeLinks.map((item) => {
              const meta = getSocialHandleMeta(item.platform);
              if (!meta) {
                return null;
              }

              const href = getSocialLinkHref(item.platform, item.url);

              return (
                <a
                  key={item.platform}
                  href={href ?? undefined}
                  target={href ? "_blank" : undefined}
                  rel={href ? "noreferrer" : undefined}
                  className="group min-w-0 rounded-2xl border border-border/70 bg-background px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.06]"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm transition-transform duration-200 group-hover:scale-105",
                        meta.badgeClassName,
                      )}
                    >
                      {meta.badge}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                      {/* <p className="text-[10px] leading-3 text-muted-foreground [overflow-wrap:anywhere]">
                        {item.url}
                      </p> */}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
