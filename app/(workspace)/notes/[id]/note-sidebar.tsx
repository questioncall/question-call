"use client";

import {
  CalendarIcon,
  GlobeIcon,
  LockIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NoteDetail } from "./note-types";
import { FILE_TYPE_CONFIG, formatDate, formatTimeAgo } from "./note-types";

export function NoteSidebar({ note }: { note: NoteDetail }) {
  const cfg = FILE_TYPE_CONFIG[note.fileType];

  return (
    <div className="space-y-4">
      {/* Uploader info */}
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Uploaded by</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {note.uploaderImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={note.uploaderImage}
                alt={note.uploaderName}
                className="size-10 rounded-full border border-border/60 object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {note.uploaderName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {note.uploaderName}
              </p>
              {note.uploaderUsername && (
                <p className="text-xs text-muted-foreground">
                  @{note.uploaderUsername}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium text-foreground">
              {formatDate(note.createdAt)}
            </span>
          </div>
          {note.updatedAt !== note.createdAt && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-medium text-foreground">
                {formatTimeAgo(note.updatedAt)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            {note.visibility === "public" ? (
              <GlobeIcon className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <LockIcon className="size-4 shrink-0 text-orange-500" />
            )}
            <span className="text-muted-foreground">Visibility:</span>
            <span className={cn(
              "font-medium capitalize",
              note.visibility === "public" ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"
            )}>
              {note.visibility}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TagIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Price:</span>
            <span className={cn(
              "font-medium",
              note.price > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {note.price > 0 ? `Rs. ${note.price}` : "Free"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
