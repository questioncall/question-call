import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  portalLabel: string;
  highlights: string[];
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  portalLabel,
  highlights,
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
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Form Section */}
      <div className="flex w-full flex-col overflow-y-auto px-6 sm:px-12 lg:w-1/2 lg:px-24">
        {/* Logo */}
        <div className="pt-6 pb-6 sm:pt-8">
          <Logo compact={false} />
        </div>
        
        <div className="my-auto mx-auto w-full max-w-md pb-8">
          <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">{portalLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h1>

          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="hidden lg:block lg:w-1/2 overflow-hidden">
        <div className="relative h-full w-full overflow-hidden bg-[#f2f4f2]">
          <img
            src={imgSrc}
            alt="Authentication background"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${
              lowerTitle.includes("out") ? "grayscale opacity-90" : ""
            }`}
          />
          {/* Subtle overlay that can house highlights if wanted later */}
          <div className="absolute inset-0 bg-black/5" />
        </div>
      </div>
    </div>
  );
}
