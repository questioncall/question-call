"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSignOutPath } from "@/lib/user-paths";

type SignOutButtonProps = {
  className?: string;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
};

export function SignOutButton({
  className,
  size = "sm",
  variant = "outline",
}: SignOutButtonProps) {
  const router = useRouter();

  return (
    <Button
      className={className}
      onClick={() => router.push(getSignOutPath())}
      size={size}
      type="button"
      variant={variant}
    >
      <LogOutIcon />
      Sign out
    </Button>
  );
}
