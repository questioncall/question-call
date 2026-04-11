import type { ReactNode } from "react";
import Image from "next/image";

import { Logo } from "@/components/shared/logo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  portalLabel: string;
  highlights: string[];
  imageQuote?: string;
  children: ReactNode;
};

export function AuthShell({
  title,
  imageQuote,
  children,
}: AuthShellProps) {
  const lowerTitle = title.toLowerCase();
  let imgSrc = "/singin-img.png";
  if (lowerTitle.includes("out")) {
    imgSrc = "/singout-img.png";
  } else if (lowerTitle.includes("student")) {
    imgSrc = "/signup-student-img.png";
  } else if (lowerTitle.includes("teacher")) {
    imgSrc = "/singup-teacher-img.png";
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground">
      {/* Left Form Section */}
      <div className="flex w-full flex-col overflow-y-auto bg-background px-6 sm:px-12 lg:w-1/2 lg:border-r lg:border-border/70 lg:px-24">
        {/* Logo */}
        <div className="pt-6 pb-6 sm:pt-8">
          <Logo compact={false} showTagline={false} />
        </div>
        
        <div className="my-auto mx-auto w-full max-w-md pb-8">
          <h1 className="headline mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <div>
            {children}
          </div>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="hidden overflow-hidden lg:block lg:w-1/2">
        <div className="relative h-full w-full overflow-hidden bg-muted/20">
          <Image
            src={imgSrc}
            alt="Authentication background"
            fill
            priority
            sizes="50vw"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${
              lowerTitle.includes("out") ? "grayscale opacity-90" : ""
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-background/5 to-background/35" />
          {imageQuote ? (
            <div className="absolute inset-x-8 bottom-8 rounded-3xl border border-border/70 bg-background/75 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium leading-5 text-foreground sm:text-sm">
                &ldquo;{imageQuote}&rdquo;
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
