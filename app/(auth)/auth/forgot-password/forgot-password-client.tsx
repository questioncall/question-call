"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSignInPath } from "@/lib/user-paths";

export function ForgotPasswordClient() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [step, setStep] = useState<"request" | "verify_otp" | "reset_password" | "success">("request");
  
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      setFormError("Please enter your email.");
      return;
    }
    
    setFormError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/auth/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        // Server returned non-JSON (e.g. HTML error page)
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 404
              ? "We couldn't find an account with that email. Please double-check and try again."
              : "Something went wrong. Please try again later."),
        );
      }

      setStep("verify_otp");
      setSuccessMsg("Verification code sent! Please check your inbox.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpCode) {
      setFormError("Please enter the verification code.");
      return;
    }
    
    setFormError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });

      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        // Server returned non-JSON (e.g. HTML error page)
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 400
              ? "The verification code is incorrect. Please check and try again."
              : res.status === 404
                ? "Your reset code has expired. Please start over."
                : "Something went wrong. Please try again later."),
        );
      }

      setStep("reset_password");
      setSuccessMsg("Code verified! You can now create a new password.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to verify code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpCode || !newPassword) {
      setFormError("Please enter the verification code and a new password.");
      return;
    }
    
    setFormError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, newPassword }),
      });

      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        // Server returned non-JSON (e.g. HTML error page)
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 400
              ? "The verification code is incorrect. Please check and try again."
              : res.status === 404
                ? "Your reset code has expired. Please start over."
                : "Something went wrong. Please try again later."),
        );
      }

      setStep("success");
      setSuccessMsg("Password reset successfully! You can now sign in with your new password.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to reset password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-600">
          {successMsg}
        </div>
        <Button
          className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm"
          onClick={() => router.push(getSignInPath())}
        >
          Return to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form 
        className="space-y-4" 
        onSubmit={step === "request" ? handleSendOtp : step === "verify_otp" ? handleVerifyOtp : handleResetPassword}
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground" htmlFor="auth-email">
            Email address
          </Label>
          <Input
            id="auth-email"
            required
            disabled={step !== "request"}
            autoComplete="email"
            className="h-11 w-full rounded-xl bg-background px-3 py-2.5 text-sm shadow-sm md:text-sm"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your registered email"
            type="email"
            value={email}
          />
        </div>

        {step === "verify_otp" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground" htmlFor="auth-otp">
                Verification Code
              </Label>
              <Input
                id="auth-otp"
                required
                className="h-11 rounded-xl bg-background px-3 py-2.5 text-sm font-mono shadow-sm md:text-sm"
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="000000"
                type="text"
                maxLength={6}
                value={otpCode}
              />
            </div>
          </div>
        )}

        {step === "reset_password" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground" htmlFor="auth-new-password">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="auth-new-password"
                  required
                  autoComplete="new-password"
                  className="h-11 rounded-xl bg-background px-3 py-2.5 pr-10 text-sm shadow-sm md:text-sm"
                  minLength={8}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Create a new password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {formError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        {successMsg ? (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
            {successMsg}
          </div>
        ) : null}

        <Button
          className="mt-4 h-11 w-full rounded-xl text-sm font-semibold shadow-sm"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? step === "request"
              ? "Sending..."
              : step === "verify_otp"
                ? "Verifying..."
                : "Resetting..."
            : step === "request"
              ? "Send Verification Code"
              : step === "verify_otp"
                ? "Verify Code"
                : "Reset Password"}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href={getSignInPath()} className="ml-1 font-semibold text-primary hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
