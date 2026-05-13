"use client";

import { useState } from "react";
import { DownloadIcon, ExternalLinkIcon, FileIcon, XIcon, ZoomInIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NoteDetail } from "./note-types";
import { FILE_TYPE_CONFIG } from "./note-types";

export function NoteDocumentViewer({ note }: { note: NoteDetail }) {
  const [lightbox, setLightbox] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  if (!note.fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 py-16">
        <FileIcon className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No file attached to this note.</p>
      </div>
    );
  }

  const cfg = FILE_TYPE_CONFIG[note.fileType];

  // PDF — direct iframe embed
  if (note.fileType === "PDF") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Document Preview</h2>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={note.fileUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon className="size-3.5" />
                Open
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={note.fileUrl} download>
                <DownloadIcon className="size-3.5" />
                Download
              </a>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/5 shadow-sm">
          <iframe
            src={note.fileUrl}
            title={note.title}
            className="h-[75vh] w-full border-0"
            onError={() => setIframeError(true)}
          />
          {iframeError && (
            <div className="flex flex-col items-center gap-2 p-8">
              <p className="text-sm text-muted-foreground">Preview unavailable.</p>
              <Button asChild variant="outline" size="sm">
                <a href={note.fileUrl} target="_blank" rel="noreferrer">Open in new tab</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Image — inline with lightbox
  if (note.fileType === "Image") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Image Preview</h2>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={note.fileUrl} download>
              <DownloadIcon className="size-3.5" />
              Download
            </a>
          </Button>
        </div>
        <div
          className="group relative cursor-zoom-in overflow-hidden rounded-2xl border border-border/60 bg-muted/5 shadow-sm"
          onClick={() => setLightbox(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={note.fileUrl}
            alt={note.title}
            className="w-full max-h-[75vh] object-contain bg-black/5 dark:bg-white/5"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
            <ZoomInIcon className="size-8 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
          >
            <button
              onClick={() => setLightbox(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <XIcon className="size-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={note.fileUrl}
              alt={note.title}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  // DOCX / PPT — Google Docs Viewer iframe + download
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(note.fileUrl)}&embedded=true`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Document Preview</h2>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={note.fileUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon className="size-3.5" />
              Open
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={note.fileUrl} download>
              <DownloadIcon className="size-3.5" />
              Download
            </a>
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/5 shadow-sm">
        <iframe
          src={googleViewerUrl}
          title={note.title}
          className="h-[75vh] w-full border-0"
        />
      </div>
    </div>
  );
}
